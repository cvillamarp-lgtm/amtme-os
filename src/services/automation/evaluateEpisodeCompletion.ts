/**
 * Automation entrypoint (frontend): evaluate episode completion state.
 *
 * Delegates to the automation-episode-evaluate Edge Function which:
 *   - Evaluates 8 production/publication criteria
 *   - Derives estado_produccion + estado_publicacion
 *   - Only writes to DB if state changed (idempotent)
 *   - Logs to automation_logs
 *
 * Called fire-and-forget from hooks after episode updates.
 */
import { invokeEdgeFunction } from "@/services/functions/invokeEdgeFunction";
import type { EpisodeEvaluationOutput } from "./core/types";

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
  try {
    const result = await invokeEdgeFunction<EpisodeEvaluationOutput>(
      "automation-episode-evaluate",
      { episode_id: episodeId, source: "frontend" }
    );

    return {
      ok: result.ok ?? true,
      newEstadoProduccion: result.estadoProduccion ?? "draft",
      newEstadoPublicacion: result.estadoPublicacion ?? "not_started",
      completionScore: result.completionScore ?? 0,
      criteriaResults: result.criteriaResults ?? {},
      error: result.error,
    };
  } catch (e: unknown) {
    return {
      ok: false,
      newEstadoProduccion: "draft",
      newEstadoPublicacion: "not_started",
      completionScore: 0,
      criteriaResults: {},
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
