/**
 * Core automation: script saved or regenerated.
 *
 * Delegates to the automation-script-extraction Edge Function which:
 *   - Extracts quotes → inserts into quote_candidates
 *   - Extracts insights → inserts into insights
 *   - Logs to automation_logs
 *   - Triggers automation-episode-evaluate
 *
 * The Edge Function is also called by a SQL trigger on episodes.script_*
 * changes, so backend coverage is guaranteed even outside the frontend.
 *
 * Core layer — no React or toast dependencies.
 * Can be called from UI components, hooks, or backend entrypoints.
 */
import { invokeEdgeFunction } from "@/services/functions/invokeEdgeFunction";
import { acquireLock, releaseLock } from "../infrastructure/runLock";
import type { ScriptExtractionOutput } from "./types";

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

  // Client-side lock prevents double-fire from rapid UI interactions.
  // Server-side idempotency window in the EF handles frontend + DB trigger overlap.
  if (!acquireLock("script_saved", episodeId)) {
    return { ok: true, quotesExtracted: 0, insightsExtracted: 0 };
  }

  try {
    const result = await invokeEdgeFunction<ScriptExtractionOutput>(
      "automation-script-extraction",
      {
        episode_id: episodeId,
        script,
        episode_title: episodeTitle,
        episode_number: episodeNumber,
        source: "frontend",
      }
    );

    return {
      ok: result.ok ?? true,
      quotesExtracted: result.quotesExtracted ?? 0,
      insightsExtracted: result.insightsExtracted ?? 0,
      error: result.error,
    };
  } catch (e: unknown) {
    return {
      ok: false,
      quotesExtracted: 0,
      insightsExtracted: 0,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  } finally {
    releaseLock("script_saved", episodeId);
  }
}
