// Type definitions for various statuses

type ExportPackageStatus = 'VALID' | 'INVALID';
type PublicationQueueStatus = 'QUEUED' | 'PUBLISHED' | 'FAILED';
type EpisodeProductionState = 'IN_PRODUCTION' | 'COMPLETED';
type EpisodePublicationState = 'SCHEDULED' | 'PUBLISHED' | 'UNPUBLISHED';

// Arrays of valid statuses
const validExportPackageStatuses: ExportPackageStatus[] = ['VALID', 'INVALID'];
const validPublicationQueueStatuses: PublicationQueueStatus[] = ['QUEUED', 'PUBLISHED', 'FAILED'];
export const validEpisodeProductionStates: EpisodeProductionState[] = ['IN_PRODUCTION', 'COMPLETED'];
export const validEpisodePublicationStates: EpisodePublicationState[] = ['SCHEDULED', 'PUBLISHED', 'UNPUBLISHED'];

// Type guard functions
function validateExportPackageStatus(status: unknown): status is ExportPackageStatus {
    return validExportPackageStatuses.includes(status);
}

function validatePublicationStatus(status: unknown): status is PublicationQueueStatus {
    return validPublicationQueueStatuses.includes(status);
}

// Ensure functions
export function ensureValidExportStatus(status: ExportPackageStatus): void {
    if (!validateExportPackageStatus(status)) {
        throw new Error(`Invalid Export Package Status: ${status}`);
    }
}

export function ensureValidPublicationStatus(status: PublicationQueueStatus): void {
    if (!validatePublicationStatus(status)) {
        throw new Error(`Invalid Publication Status: ${status}`);
    }
}

// Data integrity check interface
export interface DataIntegrityCheck {
    validateEpisodeSync(episodeId: string): boolean;
}