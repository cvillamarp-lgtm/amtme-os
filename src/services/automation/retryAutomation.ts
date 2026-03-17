/**
 * retryAutomation — re-run an automation based on a failed log entry.
 *
 * Accepts a row from automation_logs_view and dispatches to the appropriate
 * core automation function based on event_type / entity_type.
 */
import { onScriptSaved } from "./core/scriptExtraction";
import { onAssetApproved } from "./core/assetPublication";
import { onPublicationStateChanged } from "./core/publicationEvent";
import { evaluateEpisodeCompletion } from "./core/episodeEvaluation";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type LogRow = Tables<"automation_logs_view"> & Record<string, unknown>;

/**
 * Retry the automation described by `log`.
 * Throws if the event_type is unrecognised or required fields are missing.
 */
export async function retryAutomation(log: LogRow): Promise<void> {
  const { event_type, entity_id, episode_id, metadata } = log;
  const meta = (metadata ?? {}) as Record<string, unknown>;

  switch (event_type) {
    case "script_extraction":
    case "script_saved": {
      const episodeIdToUse = episode_id ?? entity_id;
      if (!episodeIdToUse) throw new Error("episode_id required for script retry");

      // Fetch the current script from the episode
      const { data, error } = await supabase
        .from("episodes")
        .select("script_base, script_generated, title, number")
        .eq("id", episodeIdToUse)
        .maybeSingle();
      if (error || !data) throw new Error("No se pudo obtener el episodio");

      await onScriptSaved({
        episodeId: episodeIdToUse,
        script: (data.script_generated ?? data.script_base ?? "") as string,
        episodeTitle: data.title ?? undefined,
        episodeNumber: data.number ?? undefined,
      });
      break;
    }

    case "asset_publication":
    case "asset_approved": {
      const assetId = entity_id;
      const epId = episode_id ?? (meta.episode_id as string | undefined);
      if (!assetId || !epId) throw new Error("asset_candidate_id y episode_id requeridos");

      await onAssetApproved({
        assetCandidateId: assetId,
        episodeId: epId,
        platform: (meta.platform as string | undefined) ?? null,
        bodyText: (meta.body_text as string | undefined) ?? null,
        title: (meta.title as string | undefined) ?? null,
      });
      break;
    }

    case "publication_event":
    case "publication_state_changed": {
      const pubId = entity_id;
      const epId = episode_id ?? (meta.episode_id as string | undefined) ?? undefined;
      const newStatus = (meta.new_status as string | undefined) ?? "published";
      if (!pubId) throw new Error("publication_queue_id requerido");

      await onPublicationStateChanged({
        publicationQueueId: pubId,
        episodeId: epId ?? null,
        platform: (meta.platform as string | undefined) ?? null,
        newStatus,
      });
      break;
    }

    case "episode_evaluate":
    case "episode_evaluation": {
      const epId = episode_id ?? entity_id;
      if (!epId) throw new Error("episode_id requerido");
      await evaluateEpisodeCompletion(epId);
      break;
    }

    default:
      throw new Error(`Tipo de evento no reconocido para retry: ${event_type}`);
  }
}