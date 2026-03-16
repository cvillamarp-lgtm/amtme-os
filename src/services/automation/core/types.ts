/**
 * Shared TypeScript interfaces for the automation layer.
 *
 * These types describe the input/output shape of the 4 automation
 * Edge Functions as seen from the frontend entrypoints.
 *
 * State machines (Phase 6):
 *
 * estado_produccion (6 states):
 *   draft            — no meaningful data
 *   script_ready     — title + theme + script
 *   assets_ready     — script + audio + quotes + approved assets
 *   ready_to_publish — has export package
 *   published        — has published publication
 *   closed           — published + real performance metrics
 *
 * estado_publicacion (5 states):
 *   none      — no approved assets
 *   draft     — approved assets or draft publication
 *   scheduled — has scheduled publication
 *   published — has published publication
 *   closed    — published + real metrics (auto-close)
 */

// ── State literals ────────────────────────────────────────────────────────────

export type EstadoProduccion =
  | "draft"
  | "script_ready"
  | "assets_ready"
  | "ready_to_publish"
  | "published"
  | "closed";

export type EstadoPublicacion =
  | "none"
  | "draft"
  | "scheduled"
  | "published"
  | "closed";

// ── Script extraction ─────────────────────────────────────────────────────────

export interface ScriptExtractionInput {
  episode_id: string;
  script: string;
  episode_title?: string;
  episode_number?: string | number | null;
  source?: "frontend" | "db_trigger";
}

export interface ScriptExtractionOutput {
  ok: boolean;
  quotesExtracted: number;
  insightsExtracted: number;
  runId?: string;
  skipped?: boolean;
  error?: string;
}

// ── Asset publication ─────────────────────────────────────────────────────────

export interface AssetPublicationInput {
  asset_candidate_id: string;
  episode_id: string;
  platform?: string | null;
  body_text?: string | null;
  title?: string | null;
  source?: "frontend" | "db_trigger";
}

export interface AssetPublicationOutput {
  ok: boolean;
  publicationId: string | null;
  skipped: boolean;
  runId?: string;
  error?: string;
}

// ── Publication event ─────────────────────────────────────────────────────────

export interface PublicationEventInput {
  publication_queue_id: string;
  episode_id?: string | null;
  platform?: string | null;
  new_status: string;
  source?: "frontend" | "db_trigger";
}

export interface PublicationEventOutput {
  ok: boolean;
  snapshotCreated: boolean;
  runId?: string;
  error?: string;
}

// ── Episode evaluation ────────────────────────────────────────────────────────

export interface EpisodeEvaluationInput {
  episode_id: string;
  source?: "frontend" | "db_trigger" | string;
}

export interface EpisodeEvaluationOutput {
  ok: boolean;
  completionScore: number;
  estadoProduccion: EstadoProduccion;
  estadoPublicacion: EstadoPublicacion;
  performanceScore: number | null;
  criteriaResults: Record<string, boolean>;
  runId?: string;
  error?: string;
}
