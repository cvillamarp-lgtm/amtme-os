/**
 * Retry dispatcher for automation runs.
 *
 * Reads event_type and metadata from an automation_logs row
 * and re-invokes the corresponding frontend entrypoint (which in turn
 * calls the backend Edge Function).
 *
 * For script_saved: fetches the current script from the episode row
 * since scripts are not stored in log metadata (size concerns).
 */
import { supabase } from "@/integrations/supabase/client";
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

export async function retryAutomation(log: AutomationLog): Promise<RetryResult> {
  const meta = (log.metadata as Record<string, unknown>) ?? {};

  try {
    switch (log.event_type) {
      case "script_saved": {
        if (!log.episode_id) return { ok: false, error: "Missing episode_id" };

        // Fetch the current script from the episode — scripts are not stored in metadata
        const { data: episode } = await supabase
          .from("episodes")
          .select("script_base, script_generated, working_title, number")
          .eq("id", log.episode_id)
          .single();

        const script = episode?.script_generated || episode?.script_base;
        if (!script || script.trim().length < 50) {
          return { ok: false, error: "No meaningful script found on episode for retry" };
        }

        await onScriptSaved({
          episodeId: log.episode_id,
          script,
          episodeTitle: episode?.working_title ?? undefined,
          episodeNumber: episode?.number ?? undefined,
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
          newStatus: (meta.new_status as string) ?? "published",
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
