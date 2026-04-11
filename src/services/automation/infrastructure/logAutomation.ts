/**
 * Utility: persist a structured automation event to automation_logs.
 * Always fire-and-forget — never throws or blocks the calling flow.
 *
 * Status contract:
 *   started  — automation run has begun
 *   success  — run completed without errors
 *   skipped  — run was a no-op (idempotency guard, insufficient data, etc.)
 *   error    — run failed with a recoverable or non-recoverable error
 *
 * Infrastructure layer — no React dependencies.
 * Used by frontend components and hooks to write log entries directly.
 * Backend Edge Functions have their own logging via adminClient.
 */
import { supabase } from "@/integrations/supabase/client";

export type AutomationStatus = "started" | "success" | "skipped" | "error";

export type AutomationEventType =
  | "script_saved"
  | "asset_approved"
  | "publication_state_changed"
  | "episode_completion";

export type AutomationEntityType = "episode" | "asset_candidate" | "publication_queue";

export interface AutomationLogEntry {
  runId: string;
  eventType: AutomationEventType;
  entityType: AutomationEntityType;
  entityId?: string;
  episodeId?: string;
  status: AutomationStatus;
  resultSummary?: string;
  skipReason?: string;
  errorMessage?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

/** Generate a new run-scoped UUID. Call once at the start of each automation run. */
export function generateRunId(): string {
  return crypto.randomUUID();
}

export async function logAutomation(entry: AutomationLogEntry): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    await supabase
      .from("automation_logs")
      .insert({
        user_id: session?.user?.id ?? null,
        run_id: entry.runId,
        event_type: entry.eventType,
        entity_type: entry.entityType,
        entity_id: entry.entityId ?? null,
        episode_id: entry.episodeId ?? null,
        status: entry.status,
        result_summary: entry.resultSummary ?? null,
        skip_reason: entry.skipReason ?? null,
        error_message: entry.errorMessage ?? null,
        duration_ms: entry.durationMs ?? null,
        metadata: entry.metadata ?? {},
      });
  } catch {
    // Logging must never crash the calling code
  }
}
