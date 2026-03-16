/**
 * Utility: persist a structured automation event to automation_logs.
 * Always fire-and-forget — never throws or blocks the calling flow.
 */
import { supabase } from "@/integrations/supabase/client";

export interface AutomationLogEntry {
  eventType: "script_saved" | "asset_approved" | "publication_state_changed" | "episode_completion";
  entityType: "episode" | "asset_candidate" | "publication_queue";
  entityId?: string;
  episodeId?: string;
  status: "ok" | "error" | "skipped";
  resultSummary?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export async function logAutomation(entry: AutomationLogEntry): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    supabase
      .from("automation_logs")
      .insert({
        user_id: session?.user?.id ?? null,
        event_type: entry.eventType,
        entity_type: entry.entityType,
        entity_id: entry.entityId ?? null,
        episode_id: entry.episodeId ?? null,
        status: entry.status,
        result_summary: entry.resultSummary ?? null,
        error_message: entry.errorMessage ?? null,
        metadata: entry.metadata ?? {},
      })
      .then(() => {});
  } catch {
    // Logging must never crash the calling code
  }
}
