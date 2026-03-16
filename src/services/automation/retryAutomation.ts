/**
 * Retry dispatcher for automation runs.
 *
 * Reads event_type and metadata from an automation_logs row
 * and re-invokes the corresponding service function.
 *
 * The metadata stored in each success/error log entry always contains
 * all the parameters needed to replay the run.
 */
import type { Tables } from "@/integrations/supabase/types";
import { onScriptSaved } from "./onScriptSaved";
import { onAssetApproved } from "./onAssetApproved";
import { onPublicationStateChanged } from "./onPublicationStateChanged";
import { evaluateEpisodeCompletion } from "./evaluateEpisodeCompletion";

type AutomationLog = Tables<"automation_logs">;

export interface RetryResult {
  ok: boolean;
  error?: string;
}

/**
 * Retry an automation run from a log entry.
 * Returns ok:true if the retry was dispatched (even if the run itself later fails).
 */
export async function retryAutomation(log: AutomationLog): Promise<RetryResult> {
  const meta = (log.metadata as Record<string, unknown>) ?? {};

  try {
    switch (log.event_type) {
      case "script_saved": {
        if (!log.episode_id) return { ok: false, error: "Missing episode_id" };
        const script = (meta.script as string) ?? "";
        if (!script) return { ok: false, error: "No script in metadata — cannot retry" };
        await onScriptSaved({
          episodeId: log.episode_id,
          script,
          episodeTitle: meta.episodeTitle as string | undefined,
          episodeNumber: meta.episodeNumber as string | number | null | undefined,
        });
        return { ok: true };
      }

      case "asset_approved": {
        if (!log.entity_id || !log.episode_id) {
          return { ok: false, error: "Missing entity_id or episode_id" };
        }
        await onAssetApproved({
          assetCandidateId: log.entity_id,
          episodeId: log.episode_id,
          platform: meta.platform as string | null,
        });
        return { ok: true };
      }

      case "publication_state_changed": {
        if (!log.entity_id) return { ok: false, error: "Missing entity_id" };
        await onPublicationStateChanged({
          publicationQueueId: log.entity_id,
          newStatus: (meta.newStatus as string) ?? "published",
          episodeId: log.episode_id ?? null,
          platform: meta.platform as string | null,
        });
        return { ok: true };
      }

      case "episode_completion": {
        if (!log.episode_id) return { ok: false, error: "Missing episode_id" };
        await evaluateEpisodeCompletion(log.episode_id);
        return { ok: true };
      }

      default:
        return { ok: false, error: `Unknown event_type: ${log.event_type}` };
    }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
