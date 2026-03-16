/**
 * Edge Function: automation-episode-evaluate
 *
 * Evaluates 8 production/publication criteria for an episode and updates
 * estado_produccion + estado_publicacion if they changed.
 *
 * Accepts:
 *   - User JWT (called from frontend)
 *   - Service Role Key (called from other automation EFs or SQL trigger)
 *
 * Body: { episode_id, run_id?, source? }
 * Returns: { ok, completionScore, estadoProduccion, estadoPublicacion, criteriaResults, runId }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

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
      episode_id,
      run_id: providedRunId,
      source = "frontend",
    } = body as { episode_id: string; run_id?: string; source?: string };

    if (!episode_id) {
      return json({ error: "episode_id required" }, 400, cors);
    }

    // ── Auth resolution ────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    let userId: string;

    const isServiceRole = authHeader === `Bearer ${SERVICE_ROLE_KEY}`;
    if (isServiceRole) {
      const { data: ep } = await adminClient
        .from("episodes")
        .select("user_id")
        .eq("id", episode_id)
        .single();
      if (!ep?.user_id) return json({ error: "Episode not found" }, 404, cors);
      userId = ep.user_id;
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
      event_type: "episode_completion",
      entity_type: "episode",
      entity_id: episode_id,
      episode_id,
      status: "started",
      metadata: { source },
    });

    // ── Fetch episode + counts in parallel ─────────────────────────────────────
    const [epRes, takesRes, quotesRes, assetsRes, exportsRes, publicationsRes] =
      await Promise.all([
        adminClient
          .from("episodes")
          .select(
            "user_id, working_title, title, theme, script_base, script_generated, estado_produccion, estado_publicacion"
          )
          .eq("id", episode_id)
          .single(),
        adminClient
          .from("audio_takes")
          .select("id", { count: "exact", head: true })
          .eq("episode_id", episode_id),
        adminClient
          .from("quote_candidates")
          .select("id", { count: "exact", head: true })
          .eq("episode_id", episode_id),
        adminClient
          .from("asset_candidates")
          .select("id", { count: "exact", head: true })
          .eq("episode_id", episode_id)
          .eq("status", "approved"),
        adminClient
          .from("export_packages")
          .select("id", { count: "exact", head: true })
          .eq("episode_id", episode_id),
        adminClient
          .from("publication_queue")
          .select("id", { count: "exact", head: true })
          .eq("episode_id", episode_id),
      ]);

    const episode = epRes.data;

    // ── Evaluate criteria ──────────────────────────────────────────────────────
    const criteria: Record<string, boolean> = {
      hasTitle: !!(episode?.working_title || episode?.title),
      hasTheme: !!episode?.theme,
      hasScript: !!(
        (episode?.script_base?.trim() ?? "").length > 50 ||
        (episode?.script_generated?.trim() ?? "").length > 50
      ),
      hasAudio: (takesRes.count ?? 0) > 0,
      hasQuotes: (quotesRes.count ?? 0) > 0,
      hasApprovedAssets: (assetsRes.count ?? 0) > 0,
      hasExportPackage: (exportsRes.count ?? 0) > 0,
      hasPublication: (publicationsRes.count ?? 0) > 0,
    };

    const trueCount = Object.values(criteria).filter(Boolean).length;
    const completionScore = Math.round((trueCount / Object.keys(criteria).length) * 100);

    // Derive estado_produccion
    let estadoProduccion: string;
    if (
      criteria.hasTitle &&
      criteria.hasTheme &&
      criteria.hasScript &&
      criteria.hasAudio &&
      criteria.hasQuotes
    ) {
      estadoProduccion = "ready_to_export";
    } else if (criteria.hasTitle && criteria.hasTheme && criteria.hasScript) {
      estadoProduccion = "scripted";
    } else if (criteria.hasTitle || criteria.hasTheme) {
      estadoProduccion = "in_progress";
    } else {
      estadoProduccion = "draft";
    }

    // Derive estado_publicacion
    let estadoPublicacion: string;
    if (criteria.hasPublication && criteria.hasExportPackage) {
      estadoPublicacion = "ready";
    } else if (criteria.hasExportPackage) {
      estadoPublicacion = "packaged";
    } else if (criteria.hasApprovedAssets) {
      estadoPublicacion = "assets_ready";
    } else {
      estadoPublicacion = "not_started";
    }

    // Write only if changed
    const currentProd = episode?.estado_produccion ?? "draft";
    const currentPub = episode?.estado_publicacion ?? "not_started";

    if (currentProd !== estadoProduccion || currentPub !== estadoPublicacion) {
      await adminClient
        .from("episodes")
        .update({
          estado_produccion: estadoProduccion,
          estado_publicacion: estadoPublicacion,
        })
        .eq("id", episode_id);
    }

    const durationMs = Date.now() - started;

    await adminClient.from("automation_logs").insert({
      user_id: userId,
      run_id: runId,
      event_type: "episode_completion",
      entity_type: "episode",
      entity_id: episode_id,
      episode_id,
      status: "success",
      result_summary: `Score ${completionScore}% · prod: ${estadoProduccion} · pub: ${estadoPublicacion}`,
      duration_ms: durationMs,
      metadata: {
        source,
        completionScore,
        criteria,
        estadoProduccion,
        estadoPublicacion,
      },
    });

    return json(
      { ok: true, completionScore, estadoProduccion, estadoPublicacion, criteriaResults: criteria, runId },
      200,
      cors
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return json({ ok: false, error: message }, 500, cors);
  }
});
