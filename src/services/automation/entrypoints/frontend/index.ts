/**
 * Frontend entrypoints for automation events.
 *
 * These are the functions UI components and hooks call when a user action
 * should trigger an automation. They delegate to the core layer which calls
 * the corresponding Edge Function.
 *
 * Backend entrypoints are the SQL triggers in supabase/migrations/:
 *   - trg_episode_script_changed    → automation-script-extraction
 *   - trg_episode_fields_changed    → automation-episode-evaluate
 *   - trg_asset_approved            → automation-asset-publication
 *   - trg_publication_status_changed → automation-publication-event
 *   - trg_export_package_created    → automation-episode-evaluate
 *
 * The frontend should only call these explicitly for user-initiated actions
 * (e.g. "Extract quotes" button). Background orchestration runs from backend.
 */

export { onScriptSaved } from "../../core/scriptExtraction";
export type { OnScriptSavedParams, OnScriptSavedResult } from "../../core/scriptExtraction";

export { onAssetApproved } from "../../core/assetPublication";
export type { OnAssetApprovedParams, OnAssetApprovedResult } from "../../core/assetPublication";

export { onPublicationStateChanged } from "../../core/publicationEvent";
export type {
  OnPublicationStateChangedParams,
  OnPublicationStateChangedResult,
} from "../../core/publicationEvent";

export { evaluateEpisodeCompletion } from "../../core/episodeEvaluation";
export type { EpisodeCompletionResult } from "../../core/episodeEvaluation";
