/**
 * Core automation: publication queue item state changed.
 *
 * Delegates to the automation-publication-event Edge Function which:
 *   - Creates a metric_snapshot event row
 *   - For Instagram: triggers fetch-instagram-insights
 *   - Logs to automation_logs
 *   - Triggers automation-episode-evaluate
 *
 * The Edge Function is also called by a SQL trigger on publication_queue
 * when status transitions to 'scheduled' or 'published'.
 *
 * Core layer — no React or toast dependencies.
 * Can be called from UI components, hooks, or backend entrypoints.
 */
import { invokeEdgeFunction } from "@/services/functions/invokeEdgeFunction";
import { acquireLock, releaseLock } from "../infrastructure/runLock";
import type { PublicationEventOutput } from "./types";

const TRIGGERING_STATUSES = new Set(["scheduled", "published"]);

export interface OnPublicationStateChangedParams {
  publicationQueueId: string;
  newStatus: string;
  episodeId?: string | null;
  platform?: string | null;
}

export interface OnPublicationStateChangedResult {
  ok: boolean;
  snapshotCreated: boolean;
  error?: string;
}

export async function onPublicationStateChanged({
  publicationQueueId,
  newStatus,
  episodeId,
  platform,
}: OnPublicationStateChangedParams): Promise<OnPublicationStateChangedResult> {
  if (!TRIGGERING_STATUSES.has(newStatus)) {
    return { ok: true, snapshotCreated: false };
  }

  const lockKey = `${publicationQueueId}-${newStatus}`;
  if (!acquireLock("publication_state_changed", lockKey)) {
    return { ok: true, snapshotCreated: false };
  }

  try {
    const result = await invokeEdgeFunction<PublicationEventOutput>(
      "automation-publication-event",
      {
        publication_queue_id: publicationQueueId,
        new_status: newStatus,
        episode_id: episodeId ?? undefined,
        platform: platform ?? undefined,
        source: "frontend",
      }
    );

    return {
      ok: result.ok ?? true,
      snapshotCreated: result.snapshotCreated ?? false,
      error: result.error,
    };
  } catch (e: unknown) {
    return {
      ok: false,
      snapshotCreated: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  } finally {
    releaseLock("publication_state_changed", lockKey);
  }
}
