/**
 * Core automation: asset candidate approved.
 *
 * Delegates to the automation-asset-publication Edge Function which:
 *   - Creates a draft publication_queue entry (idempotent)
 *   - Builds a caption base from body_text + title
 *   - Logs to automation_logs
 *   - Triggers automation-episode-evaluate
 *
 * The Edge Function is also called by a SQL trigger on asset_candidates
 * when status transitions to 'approved'.
 *
 * Core layer — no React or toast dependencies.
 * Can be called from UI components, hooks, or backend entrypoints.
 */
import { invokeEdgeFunction } from "@/services/functions/invokeEdgeFunction";
import { acquireLock, releaseLock } from "../infrastructure/runLock";
import type { AssetPublicationOutput } from "./types";

export interface OnAssetApprovedParams {
  assetCandidateId: string;
  episodeId: string;
  platform?: string | null;
  bodyText?: string | null;
  title?: string | null;
}

export interface OnAssetApprovedResult {
  ok: boolean;
  publicationId: string | null;
  skipped: boolean;
  error?: string;
}

export async function onAssetApproved({
  assetCandidateId,
  episodeId,
  platform,
  bodyText,
  title,
}: OnAssetApprovedParams): Promise<OnAssetApprovedResult> {
  if (!acquireLock("asset_approved", assetCandidateId)) {
    return { ok: true, publicationId: null, skipped: true };
  }

  try {
    const result = await invokeEdgeFunction<AssetPublicationOutput>(
      "automation-asset-publication",
      {
        asset_candidate_id: assetCandidateId,
        episode_id: episodeId,
        platform: platform ?? undefined,
        body_text: bodyText ?? undefined,
        title: title ?? undefined,
        source: "frontend",
      }
    );

    return {
      ok: result.ok ?? true,
      publicationId: result.publicationId ?? null,
      skipped: result.skipped ?? false,
      error: result.error,
    };
  } catch (e: unknown) {
    return {
      ok: false,
      publicationId: null,
      skipped: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  } finally {
    releaseLock("asset_approved", assetCandidateId);
  }
}
