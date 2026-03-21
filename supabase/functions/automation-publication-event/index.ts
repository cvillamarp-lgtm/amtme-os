/**
 * Edge Function: automation-publication-event
 *
 * Fires when a publication_queue item transitions to "scheduled" or "published".
 * Creates a metric_snapshot event row. For Instagram, triggers insight fetch.
 *
 * Accepts:
 *   - User JWT (called from frontend)
 *   - Service Role Key (called from SQL trigger)
 *
 * Body: { publication_queue_id, episode_id?, platform?, new_status, run_id?, source? }
 * Returns: { ok, snapshotCreated, runId }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { errorResponse } from "../_shared/response.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const TRIGGERING_STATUSES = new Set(["scheduled", "published"]);

function json(data: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const body = await req.json();
    const {
      publication_queue_id,
      episode_id,
      platform,
      new_status,
      run_id: providedRunId,
      source = "frontend",
    } = body as {
      publication_queue_id: string;
      episode_id?: string;
      platform?: string;
      new_status: string;
      run_id?: string;
      source?: string;
    };

    if (!publication_queue_id || !new_status) {
      return json({ error: "publication_queue_id and new_status required" }, 400, cors);
    }

    // Only act on meaningful status transitions
    if (!TRIGGERING_STATUSES.has(new_status)) {
      return json({ ok: true, snapshotCreated: false, skipped: true }, 200, cors);
    }

    // ── Auth resolution ────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    let userId: string;

    const isServiceRole = authHeader === `Bearer ${SERVICE_ROLE_KEY}`;
    if (isServiceRole) {
      // Look up owner via publication_queue
      const { data: pq } = await adminClient
        .from("publication_queue")
        .select("user_id")
        .eq("id", publication_queue_id)
        .single();
      if (!pq?.user_id) return json({ error: "Publication queue item not found" }, 404, cors);
      userId = pq.user_id;
    } else {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const {
        data: { user },
      } = await userClient.auth.getUser();
      if (!user) return json({ error: "Unauthorized" }, 401, cors);
      userId = user.id;
    }

    const runId = providedRunId ?? crypto.randomUUID();
    const started = Date.now();

    await adminClient.from("automation_logs").insert({
      user_id: userId,
      run_id: runId,
      event_type: "publication_state_changed",
      entity_type: "publication_queue",
      entity_id: publication_queue_id,
      episode_id: episode_id ?? null,
      status: "started",
      metadata: { source, new_status, platform },
    });

    // Non-critical: try to refresh Instagram insights
    if (platform?.startsWith("instagram")) {
      fetch(`${SUPABASE_URL}/functions/v1/fetch-instagram-insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
        body: JSON.stringify({}),
      }).catch(() => {});
    }

    // Create metric snapshot event
    let snapshotCreated = false;
    const { error: snapError } = await adminClient.from("metric_snapshots").insert({
      user_id: userId,
      episode_id: episode_id ?? null,
      platform: platform ?? "unknown",
      metric_type: "publication_event",
      value: 0,
      snapshot_date: new Date().toISOString().split("T")[0],
      raw_data: {
        publication_queue_id,
        status: new_status,
        triggered_at: new Date().toISOString(),
      },
    });
    if (!snapError) snapshotCreated = true;

    const durationMs = Date.now() - started;

    await adminClient.from("automation_logs").insert({
      user_id: userId,
      run_id: runId,
      event_type: "publication_state_changed",
      entity_type: "publication_queue",
      entity_id: publication_queue_id,
      episode_id: episode_id ?? null,
      status: "success",
      result_summary: `Estado → ${new_status} · snapshot: ${snapshotCreated}`,
      duration_ms: durationMs,
      metadata: { source, new_status, platform, snapshotCreated },
    });

    // Fire-and-forget episode evaluation
    if (episode_id) {
      fetch(`${SUPABASE_URL}/functions/v1/automation-episode-evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ episode_id, source: "automation-publication-event" }),
      }).catch(() => {});
    }

    return json({ ok: true, snapshotCreated, runId }, 200, cors);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return json({ ok: false, snapshotCreated: false, error: message }, 500, cors);
  }
});
