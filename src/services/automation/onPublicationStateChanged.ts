/**
 * Automation: publication queue item state changed to "scheduled" or "published".
 *
 * Triggers:
 *   - For Instagram platforms: invoke fetch-instagram-insights to capture a snapshot.
 *   - For all platforms: insert a metric_snapshot event row (type: publication_event).
 *
 * Called from useUpdatePublicationQueueStatus when the new status is one of
 * the triggering values.
 */
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/services/functions/invokeEdgeFunction";
import { logAutomation } from "./logAutomation";
import { evaluateEpisodeCompletion } from "./evaluateEpisodeCompletion";

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
  // Only act on meaningful status transitions
  if (!TRIGGERING_STATUSES.has(newStatus)) {
    return { ok: true, snapshotCreated: false };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { ok: false, snapshotCreated: false, error: "No session" };
  }

  let snapshotCreated = false;

  try {
    // For Instagram: trigger real-time insights fetch (non-critical)
    if (platform?.startsWith("instagram")) {
      try {
        await invokeEdgeFunction("fetch-instagram-insights", {});
      } catch {
        // Non-blocking — metrics fetch failure should not abort the automation
      }
    }

    // Create a metric_snapshot event row for every triggering status change
    const { error: snapError } = await supabase.from("metric_snapshots").insert({
      user_id: session.user.id,
      episode_id: episodeId ?? null,
      platform: platform ?? "unknown",
      metric_type: "publication_event",
      value: 0,
      snapshot_date: new Date().toISOString().split("T")[0],
      raw_data: {
        publication_queue_id: publicationQueueId,
        status: newStatus,
        triggered_at: new Date().toISOString(),
      },
    });

    if (!snapError) snapshotCreated = true;

    await logAutomation({
      eventType: "publication_state_changed",
      entityType: "publication_queue",
      entityId: publicationQueueId,
      episodeId: episodeId ?? undefined,
      status: "ok",
      resultSummary: `Estado → ${newStatus} · snapshot: ${snapshotCreated}`,
      metadata: { newStatus, platform, snapshotCreated },
    });

    // Re-evaluate completion — hasPublication criterion may now be satisfied
    if (episodeId) {
      evaluateEpisodeCompletion(episodeId).catch(() => {});
    }

    return { ok: true, snapshotCreated };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";

    await logAutomation({
      eventType: "publication_state_changed",
      entityType: "publication_queue",
      entityId: publicationQueueId,
      episodeId: episodeId ?? undefined,
      status: "error",
      errorMessage: message,
      metadata: { newStatus, platform },
    });

    return { ok: false, snapshotCreated: false, error: message };
  }
}
