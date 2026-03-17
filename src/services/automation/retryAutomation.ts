/**
 * Retry automation for a failed or errored automation log entry.
 *
 * Looks at the event_type of the log and re-dispatches to the appropriate
 * automation core handler.
 *
 * Core layer — no React or toast dependencies.
 */
import { onScriptSaved } from './core/scriptExtraction';
import { onAssetApproved } from './core/assetPublication';
import { onPublicationStateChanged } from './core/publicationEvent';
import { evaluateEpisodeCompletion } from './core/episodeEvaluation';

export interface AutomationLogRow {
  id: string;
  event_type: string;
  entity_type?: string | null;
  entity_id?: string | null;
  episode_id?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Re-run the automation that corresponds to an automation log entry.
 * Used by the UI retry button in AutomationLogPanel.
 */
export async function retryAutomation(log: AutomationLogRow): Promise<void> {
  const episodeId = log.episode_id ?? log.entity_id ?? "";

  switch (log.event_type) {
    case "script_saved":
      await onScriptSaved({ episodeId });
      break;
    case "asset_approved":
      await onAssetApproved({ assetCandidateId: log.entity_id ?? "", episodeId });
      break;
    case "publication_state_changed":
      await onPublicationStateChanged({ publicationId: log.entity_id ?? "", episodeId });
      break;
    case "episode_completion":
      await evaluateEpisodeCompletion({ episodeId });
      break;
    default:
      console.warn(`retryAutomation: unknown event_type "${log.event_type}", skipping`);
  }
}
