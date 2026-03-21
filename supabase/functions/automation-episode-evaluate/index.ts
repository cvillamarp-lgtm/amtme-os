/**
 * Edge Function: automation-episode-evaluate  (Phase 6 — final state machine)
 *
 * Evaluates the full editorial pipeline state for an episode and updates:
 *   - estado_produccion  (6-state machine)
 *   - estado_publicacion (5-state machine)
 *   - performance_score  (0-100, from real metrics)
 *
 * Estado Produccion:
 *   draft            — no title/theme or minimal data
 *   script_ready     — title + theme + script ≥50 chars
 *   assets_ready     — script + audio + quotes + approved assets
 *   ready_to_publish — has export package
 *   published        — has a published publication
 *   closed           — published + real performance metrics captured
 *
 * Estado Publicacion:
 *   none      — no approved assets yet
 *   draft     — approved assets or draft publication exists
 *   scheduled — has scheduled publication
 *   published — has published publication
 *   closed    — published + real metrics captured (auto-close)
 *
 * Accepts User JWT or Service Role Key (from other EFs / SQL trigger).
 * Body: { episode_id, run_id?, source? }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { errorResponse } from "../_shared/response.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function json(data: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

/**
 * Calculate episode_performance_score (0-100) from metric_snapshots.
 * Formula (tunable):
 *   plays      × 0.40  (normalized to 1 000 plays = 40 pts)
 *   engagement × 0.30  (normalized to   200 engagements = 30 pts)
 *   saves      × 0.20  (normalized to    50 saves = 20 pts)
 *   shares     × 0.10  (normalized to    20 shares = 10 pts)
 */
function calcPerformanceScore(
  plays: number,
  reach: number,
  engagement: number,
  saves: number,
  shares: number
): number {
  const combined = reach || plays; // prefer reach; fall back to plays
  const score =
    Math.min(1, combined    / 1000) * 40 +
    Math.min(1, engagement  /  200) * 30 +
    Math.min(1, saves       /   50) * 20 +
    Math.min(1, shares      /   20) * 10;
  return Math.round(Math.min(100, score));
}

serve(async (req: Request) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const body = await req.json();
    const {
      episode_id,
      run_id: providedRunId,
      source = "frontend",
    } = body as { episode_id: string; run_id?: string; source?: string };

    if (!episode_id) return json({ error: "episode_id required" }, 400, cors);

    // ── Auth resolution ────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    let userId: string;

    const isServiceRole = authHeader === `Bearer ${SERVICE_ROLE_KEY}`;
    if (isServiceRole) {
      const { data: ep } = await adminClient
        .from("episodes").select("user_id").eq("id", episode_id).single();
      if (!ep?.user_id) return json({ error: "Episode not found" }, 404, cors);
      userId = ep.user_id;
    } else {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) return json({ error: "Unauthorized" }, 401, cors);
      userId = user.id;
    }

    const runId = providedRunId ?? crypto.randomUUID();
    const started = Date.now();

    await adminClient.from("automation_logs").insert({
      user_id: userId, run_id: runId, event_type: "episode_completion",
      entity_type: "episode", entity_id: episode_id, episode_id,
      status: "started", metadata: { source },
    });

    // ── Parallel data fetches ─────────────────────────────────────────────────
    const [
      epRes,
      takesRes, quotesRes, approvedAssetsRes,
      exportsRes,
      anyPubRes, draftPubRes, scheduledPubRes, publishedPubRes,
      realMetricsRes,
    ] = await Promise.all([
      // Episode fields
      adminClient.from("episodes")
        .select("user_id,working_title,title,theme,script_base,script_generated,estado_produccion,estado_publicacion,performance_score")
        .eq("id", episode_id).single(),

      // Production criteria
      adminClient.from("audio_takes").select("id", { count: "exact", head: true }).eq("episode_id", episode_id),
      adminClient.from("quote_candidates").select("id", { count: "exact", head: true }).eq("episode_id", episode_id),
      adminClient.from("asset_candidates").select("id", { count: "exact", head: true }).eq("episode_id", episode_id).eq("status", "approved"),
      adminClient.from("export_packages").select("id", { count: "exact", head: true }).eq("episode_id", episode_id),

      // Publication pipeline
      adminClient.from("publication_queue").select("id", { count: "exact", head: true }).eq("episode_id", episode_id),
      adminClient.from("publication_queue").select("id", { count: "exact", head: true }).eq("episode_id", episode_id).eq("status", "draft"),
      adminClient.from("publication_queue").select("id", { count: "exact", head: true }).eq("episode_id", episode_id).eq("status", "scheduled"),
      adminClient.from("publication_queue").select("id", { count: "exact", head: true }).eq("episode_id", episode_id).eq("status", "published"),

      // Real performance metrics (excludes publication_event rows)
      adminClient.from("metric_snapshots")
        .select("metric_type, value")
        .eq("episode_id", episode_id)
        .neq("metric_type", "publication_event"),
    ]);

    const episode = epRes.data;

    // ── Evaluate criteria ──────────────────────────────────────────────────────
    const criteria: Record<string, boolean> = {
      hasTitle:           !!(episode?.working_title || episode?.title),
      hasTheme:           !!episode?.theme,
      hasScript:          !!(
        (episode?.script_base?.trim() ?? "").length > 50 ||
        (episode?.script_generated?.trim() ?? "").length > 50
      ),
      hasAudio:           (takesRes.count ?? 0) > 0,
      hasQuotes:          (quotesRes.count ?? 0) > 0,
      hasApprovedAssets:  (approvedAssetsRes.count ?? 0) > 0,
      hasExportPackage:   (exportsRes.count ?? 0) > 0,
      hasAnyPublication:  (anyPubRes.count ?? 0) > 0,
      hasDraftPub:        (draftPubRes.count ?? 0) > 0,
      hasScheduledPub:    (scheduledPubRes.count ?? 0) > 0,
      hasPublishedPub:    (publishedPubRes.count ?? 0) > 0,
      hasRealMetrics:     (realMetricsRes.data?.length ?? 0) > 0,
    };

    const trueCount = Object.values(criteria).filter(Boolean).length;
    const completionScore = Math.round((trueCount / Object.keys(criteria).length) * 100);

    // ── Performance score ──────────────────────────────────────────────────────
    let performanceScore: number | null = episode?.performance_score ?? null;

    if (criteria.hasRealMetrics && realMetricsRes.data) {
      const sum = (type: string) =>
        realMetricsRes.data!
          .filter((m) => m.metric_type === type)
          .reduce((s: number, m: { value: number }) => s + (m.value ?? 0), 0);

      const newScore = calcPerformanceScore(
        sum("plays"),
        sum("reach"),
        sum("engagement"),
        sum("saves"),
        sum("shares")
      );
      // Only update if we got a meaningful score (> 0)
      if (newScore > 0) performanceScore = newScore;
    }

    // ── Derive estado_produccion (6 states) ────────────────────────────────────
    let estadoProduccion: string;
    if (criteria.hasPublishedPub && criteria.hasRealMetrics) {
      estadoProduccion = "closed";
    } else if (criteria.hasPublishedPub) {
      estadoProduccion = "published";
    } else if (criteria.hasExportPackage) {
      estadoProduccion = "ready_to_publish";
    } else if (criteria.hasApprovedAssets && criteria.hasAudio && criteria.hasQuotes) {
      estadoProduccion = "assets_ready";
    } else if (criteria.hasTitle && criteria.hasTheme && criteria.hasScript) {
      estadoProduccion = "script_ready";
    } else {
      estadoProduccion = "draft";
    }

    // ── Derive estado_publicacion (5 states) ───────────────────────────────────
    let estadoPublicacion: string;
    if (criteria.hasPublishedPub && criteria.hasRealMetrics) {
      estadoPublicacion = "closed";
    } else if (criteria.hasPublishedPub) {
      estadoPublicacion = "published";
    } else if (criteria.hasScheduledPub) {
      estadoPublicacion = "scheduled";
    } else if (criteria.hasDraftPub || criteria.hasApprovedAssets) {
      estadoPublicacion = "draft";
    } else {
      estadoPublicacion = "none";
    }

    // ── Write only if something changed ───────────────────────────────────────
    const currentProd  = episode?.estado_produccion  ?? "draft";
    const currentPub   = episode?.estado_publicacion ?? "none";
    const currentScore = episode?.performance_score  ?? null;

    const prodChanged  = currentProd  !== estadoProduccion;
    const pubChanged   = currentPub   !== estadoPublicacion;
    const scoreChanged = performanceScore !== null && performanceScore !== currentScore;

    if (prodChanged || pubChanged || scoreChanged) {
      const update: Record<string, unknown> = {};
      if (prodChanged  || pubChanged)  { update.estado_produccion  = estadoProduccion; update.estado_publicacion = estadoPublicacion; }
      if (scoreChanged)                { update.performance_score  = performanceScore; }

      await adminClient.from("episodes").update(update).eq("id", episode_id);
    }

    const durationMs = Date.now() - started;

    await adminClient.from("automation_logs").insert({
      user_id: userId, run_id: runId, event_type: "episode_completion",
      entity_type: "episode", entity_id: episode_id, episode_id,
      status: "success",
      result_summary: `Score ${completionScore}% · prod:${estadoProduccion} · pub:${estadoPublicacion}${performanceScore != null ? ` · perf:${performanceScore}` : ""}`,
      duration_ms: durationMs,
      metadata: {
        source, completionScore, criteria,
        estadoProduccion, estadoPublicacion, performanceScore,
      },
    });

    return json({
      ok: true,
      completionScore,
      estadoProduccion,
      estadoPublicacion,
      performanceScore,
      criteriaResults: criteria,
      runId,
    }, 200, cors);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return json({ ok: false, error: message }, 500, cors);
  }
});
