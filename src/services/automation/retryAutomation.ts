/**
 * retryAutomation — re-runs a failed/stuck automation from its log row.
 *
 * Dispatches to the correct core function based on event_type.
 * Called by RecoveryAgentProvider when the user clicks "Retry" on a failed log.
 */
import { onScriptSaved } from "./core/scriptExtraction";
import { onAssetApproved } from "./core/assetPublication";
import { onPublicationStateChanged } from "./core/publicationEvent";
import { evaluateEpisodeCompletion } from "./core/episodeEvaluation";
import type { Json } from "@/integrations/supabase/types";

export interface AutomationLogRow {
  id: string | null;
  event_type: string | null;
  episode_id: string | null;
  entity_id?: string | null;
  metadata: Json | null;
}

function getMeta(row: AutomationLogRow): Record<string, unknown> {
  if (row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)) {
    return row.metadata as Record<string, unknown>;
  }
  return {};
}

export async function retryAutomation(row: AutomationLogRow): Promise<void> {
  const meta = getMeta(row);
  const eventType = row.event_type ?? "";

  if (eventType.includes("script") || eventType.includes("extraction")) {
    const episodeId = (meta.episode_id as string | undefined) ?? row.episode_id;
    if (!episodeId) throw new Error("episode_id required for script retry");
    await onScriptSaved({
      episodeId,
      script: (meta.script as string | undefined) ?? "",
      episodeTitle: (meta.episode_title as string | undefined) ?? undefined,
      episodeNumber: (meta.episode_number as string | undefined) ?? undefined,
    });
    return;
  }

  if (eventType.includes("asset") || eventType.includes("publication_asset")) {
    const assetCandidateId =
      (meta.asset_candidate_id as string | undefined) ?? row.entity_id ?? undefined;
    const episodeId =
      (meta.episode_id as string | undefined) ?? row.episode_id ?? undefined;
    if (!assetCandidateId || !episodeId) {
      throw new Error("asset_candidate_id and episode_id required for asset retry");
    }
    await onAssetApproved({
      assetCandidateId,
      episodeId,
      platform: (meta.platform as string | undefined) ?? null,
      bodyText: (meta.body_text as string | undefined) ?? null,
      title: (meta.title as string | undefined) ?? null,
    });
    return;
  }

  if (eventType.includes("publication") || eventType.includes("publication_event")) {
    const publicationQueueId =
      (meta.publication_queue_id as string | undefined) ?? row.entity_id ?? undefined;
    const newStatus = (meta.new_status as string | undefined) ?? "published";
    if (!publicationQueueId) {
      throw new Error("publication_queue_id required for publication event retry");
    }
    await onPublicationStateChanged({
      publicationQueueId,
      newStatus,
      episodeId: (meta.episode_id as string | undefined) ?? row.episode_id ?? null,
      platform: (meta.platform as string | undefined) ?? null,
    });
    return;
  }

  // Default: re-evaluate the episode
  const episodeId =
    (meta.episode_id as string | undefined) ?? row.episode_id ?? row.entity_id ?? undefined;
  if (!episodeId) throw new Error("episode_id required to retry automation");
  await evaluateEpisodeCompletion(episodeId);
}