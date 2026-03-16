/**
 * Shared TypeScript interfaces for the automation layer.
 *
 * These types are the contract between:
 *   - Frontend entrypoints (src/services/automation/*.ts)
 *   - Backend Edge Functions (supabase/functions/automation-*/index.ts)
 *
 * The Edge Functions implement the actual logic; these types describe
 * their input/output shape as seen from the frontend.
 */

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
  estadoProduccion: string;
  estadoPublicacion: string;
  criteriaResults: Record<string, boolean>;
  runId?: string;
  error?: string;
}
