/**
 * Core automation: evaluate episode completion state.
 *
 * Delegates to the automation-episode-evaluate Edge Function which:
 *   - Evaluates 12 production/publication criteria in parallel
 *   - Derives estado_produccion (6-state) + estado_publicacion (5-state)
 *   - Computes performance_score from real metrics
 *   - Only writes to DB if state changed (idempotent)
 *   - Logs to automation_logs
 *
 * Called fire-and-forget from hooks after episode updates.
 * Also triggered automatically at the end of each other automation EF.
 *
 * Core layer — no React or toast dependencies.
 */
import { invokeEdgeFunction } from "@/services/functions/invokeEdgeFunction";
import type { EpisodeEvaluationOutput } from "./types";

export interface EpisodeCompletionResult {
  ok: boolean;
  newEstadoProduccion: string;
  newEstadoPublicacion: string;
  completionScore: number;
  performanceScore: number | null;
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
      newEstadoPublicacion: result.estadoPublicacion ?? "none",
      completionScore: result.completionScore ?? 0,
      performanceScore: result.performanceScore ?? null,
      criteriaResults: result.criteriaResults ?? {},
      error: result.error,
    };
  } catch (e: unknown) {
    return {
      ok: false,
      newEstadoProduccion: "draft",
      newEstadoPublicacion: "none",
      completionScore: 0,
      performanceScore: null,
      criteriaResults: {},
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
