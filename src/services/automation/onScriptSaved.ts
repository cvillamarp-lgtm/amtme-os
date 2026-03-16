/**
 * Automation: script saved (or regenerated).
 *
 * Triggers:
 *   - Extract quotes → insert into quote_candidates
 *   - Extract insights → insert into insights
 *
 * Called from WorkspaceScript every time the user saves or regenerates
 * the script with meaningful content (≥ 50 characters).
 */
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/services/functions/invokeEdgeFunction";
import { logAutomation } from "./logAutomation";
import { evaluateEpisodeCompletion } from "./evaluateEpisodeCompletion";

export interface OnScriptSavedParams {
  episodeId: string;
  script: string;
  episodeTitle?: string;
  episodeNumber?: string | number | null;
}

export interface OnScriptSavedResult {
  ok: boolean;
  quotesExtracted: number;
  insightsExtracted: number;
  error?: string;
}

export async function onScriptSaved({
  episodeId,
  script,
  episodeTitle,
  episodeNumber,
}: OnScriptSavedParams): Promise<OnScriptSavedResult> {
  if (!script || script.trim().length < 50) {
    return { ok: true, quotesExtracted: 0, insightsExtracted: 0 };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { ok: false, quotesExtracted: 0, insightsExtracted: 0, error: "No session" };
  }

  let quotesExtracted = 0;
  let insightsExtracted = 0;

  try {
    const result = await invokeEdgeFunction<{
      quotes?: Array<{ text: string; quote_type: string; timestamp_hint: string }>;
      insights?: Array<{ hypothesis: string; category: string; potential_action: string }>;
    }>("extract-from-script", {
      script,
      mode: "both",
      episode_title: episodeTitle,
      episode_number: episodeNumber,
    });

    // Insert extracted quotes
    if (result.quotes?.length) {
      const rows = result.quotes.map((q) => ({
        user_id: session.user.id,
        episode_id: episodeId,
        text: q.text,
        quote_type: q.quote_type || null,
        timestamp_ref: q.timestamp_hint || null,
        status: "captured" as const,
        clarity: 3,
        emotional_intensity: 3,
        memorability: 3,
        shareability: 3,
        visual_fit: 3,
        score_total: 3,
        source_type: "ai_extracted",
        source_module: "automation.onScriptSaved",
      }));

      const { error } = await supabase.from("quote_candidates").insert(rows);
      if (!error) quotesExtracted = rows.length;
    }

    // Insert extracted insights
    if (result.insights?.length) {
      const rows = result.insights.map((item) => ({
        user_id: session.user.id,
        episode_id: episodeId,
        finding: item.hypothesis,
        hypothesis: item.hypothesis,
        recommendation: item.potential_action || null,
        confidence_level: "medium",
        status: "active" as const,
        source: "ai_extracted",
        category: item.category || null,
      }));

      const { error } = await supabase.from("insights").insert(rows);
      if (!error) insightsExtracted = rows.length;
    }

    await logAutomation({
      eventType: "script_saved",
      entityType: "episode",
      entityId: episodeId,
      episodeId,
      status: "ok",
      resultSummary: `${quotesExtracted} quotes · ${insightsExtracted} insights extraídos`,
      metadata: { quotesExtracted, insightsExtracted },
    });

    // Re-evaluate completion now that quotes may have been added
    // (fire-and-forget — the caller is responsible for refreshing the UI)
    evaluateEpisodeCompletion(episodeId).catch(() => {});

    return { ok: true, quotesExtracted, insightsExtracted };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";

    await logAutomation({
      eventType: "script_saved",
      entityType: "episode",
      entityId: episodeId,
      episodeId,
      status: "error",
      errorMessage: message,
      metadata: {},
    });

    return { ok: false, quotesExtracted, insightsExtracted, error: message };
  }
}
