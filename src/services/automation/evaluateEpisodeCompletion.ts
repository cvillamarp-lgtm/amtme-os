/**
 * Automation: evaluate episode completion and update estado_produccion / estado_publicacion.
 *
 * Criteria evaluated:
 *   - Datos base: working_title or title + theme
 *   - Guión: script_base or script_generated
 *   - Audio: at least one audio_take
 *   - Quotes: at least one quote_candidate
 *   - Assets: at least one approved asset_candidate
 *   - Export package: at least one export_package
 *   - Publication: at least one publication_queue entry
 *
 * Derives:
 *   - estado_produccion: draft → in_progress → scripted → ready_to_export
 *   - estado_publicacion: not_started → assets_ready → packaged → ready
 *
 * Only writes to DB if the derived state actually changed.
 * Called fire-and-forget from useEpisode after every update.
 */
import { supabase } from "@/integrations/supabase/client";
import { logAutomation } from "./logAutomation";

export interface EpisodeCompletionResult {
  ok: boolean;
  newEstadoProduccion: string;
  newEstadoPublicacion: string;
  completionScore: number;
  criteriaResults: Record<string, boolean>;
  error?: string;
}

export async function evaluateEpisodeCompletion(
  episodeId: string
): Promise<EpisodeCompletionResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return {
      ok: false,
      newEstadoProduccion: "draft",
      newEstadoPublicacion: "not_started",
      completionScore: 0,
      criteriaResults: {},
      error: "No session",
    };
  }

  try {
    // Fetch episode fields needed for evaluation
    const { data: episode } = await supabase
      .from("episodes")
      .select(
        "working_title, title, theme, script_base, script_generated, estado_produccion, estado_publicacion"
      )
      .eq("id", episodeId)
      .single();

    // Fetch operational counts in parallel
    const [takesRes, quotesRes, assetsRes, exportsRes, publicationsRes] = await Promise.all([
      supabase.from("audio_takes").select("id", { count: "exact", head: true }).eq("episode_id", episodeId),
      supabase.from("quote_candidates").select("id", { count: "exact", head: true }).eq("episode_id", episodeId),
      supabase
        .from("asset_candidates")
        .select("id", { count: "exact", head: true })
        .eq("episode_id", episodeId)
        .eq("status", "approved"),
      supabase.from("export_packages").select("id", { count: "exact", head: true }).eq("episode_id", episodeId),
      supabase.from("publication_queue").select("id", { count: "exact", head: true }).eq("episode_id", episodeId),
    ]);

    // Evaluate each criterion
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
    let newEstadoProduccion: string;
    if (criteria.hasTitle && criteria.hasTheme && criteria.hasScript && criteria.hasAudio && criteria.hasQuotes) {
      newEstadoProduccion = "ready_to_export";
    } else if (criteria.hasTitle && criteria.hasTheme && criteria.hasScript) {
      newEstadoProduccion = "scripted";
    } else if (criteria.hasTitle || criteria.hasTheme) {
      newEstadoProduccion = "in_progress";
    } else {
      newEstadoProduccion = "draft";
    }

    // Derive estado_publicacion
    let newEstadoPublicacion: string;
    if (criteria.hasPublication && criteria.hasExportPackage) {
      newEstadoPublicacion = "ready";
    } else if (criteria.hasExportPackage) {
      newEstadoPublicacion = "packaged";
    } else if (criteria.hasApprovedAssets) {
      newEstadoPublicacion = "assets_ready";
    } else {
      newEstadoPublicacion = "not_started";
    }

    // Write only if something changed — avoids unnecessary updates and change_history noise
    const currentProd = episode?.estado_produccion ?? "draft";
    const currentPub = episode?.estado_publicacion ?? "not_started";

    if (currentProd !== newEstadoProduccion || currentPub !== newEstadoPublicacion) {
      await supabase
        .from("episodes")
        .update({
          estado_produccion: newEstadoProduccion,
          estado_publicacion: newEstadoPublicacion,
        })
        .eq("id", episodeId);
    }

    await logAutomation({
      eventType: "episode_completion",
      entityType: "episode",
      entityId: episodeId,
      episodeId,
      status: "ok",
      resultSummary: `Score ${completionScore}% · prod: ${newEstadoProduccion} · pub: ${newEstadoPublicacion}`,
      metadata: { completionScore, criteria, newEstadoProduccion, newEstadoPublicacion },
    });

    return {
      ok: true,
      newEstadoProduccion,
      newEstadoPublicacion,
      completionScore,
      criteriaResults: criteria,
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";

    await logAutomation({
      eventType: "episode_completion",
      entityType: "episode",
      entityId: episodeId,
      episodeId,
      status: "error",
      errorMessage: message,
      metadata: {},
    });

    return {
      ok: false,
      newEstadoProduccion: "draft",
      newEstadoPublicacion: "not_started",
      completionScore: 0,
      criteriaResults: {},
      error: message,
    };
  }
}
