// Type definitions for various statuses

type ExportPackageStatus = 'VALID' | 'INVALID';
type PublicationQueueStatus = 'QUEUED' | 'PUBLISHED' | 'FAILED';
type EpisodeProductionState = 'IN_PRODUCTION' | 'COMPLETED';
type EpisodePublicationState = 'SCHEDULED' | 'PUBLISHED' | 'UNPUBLISHED';

// Arrays of valid statuses
const validExportPackageStatuses: ExportPackageStatus[] = ['VALID', 'INVALID'];
const validPublicationQueueStatuses: PublicationQueueStatus[] = ['QUEUED', 'PUBLISHED', 'FAILED'];
const validEpisodeProductionStates: EpisodeProductionState[] = ['IN_PRODUCTION', 'COMPLETED'];
const validEpisodePublicationStates: EpisodePublicationState[] = ['SCHEDULED', 'PUBLISHED', 'UNPUBLISHED'];

// Type guard functions
function validateExportPackageStatus(status: any): status is ExportPackageStatus {
    return validExportPackageStatuses.includes(status);
}

function validatePublicationStatus(status: any): status is PublicationQueueStatus {
    return validPublicationQueueStatuses.includes(status);
}

// Ensure functions
function ensureValidExportStatus(status: ExportPackageStatus): void {
    if (!validateExportPackageStatus(status)) {
        throw new Error(`Invalid Export Package Status: ${status}`);
    }
}

function ensureValidPublicationStatus(status: PublicationQueueStatus): void {
    if (!validatePublicationStatus(status)) {
        throw new Error(`Invalid Publication Status: ${status}`);
    }
}

// Data integrity check interface
interface DataIntegrityCheck {
    validateEpisodeSync(episodeId: string): boolean;
}