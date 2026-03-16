// ============================================================
// Workflow States — Single source of truth for all status values
// ============================================================
// Use these constants instead of raw strings anywhere in the app.
// Example: episode.status === EpisodeStatus.PUBLISHED
// ============================================================

export const EpisodeStatus = {
  DRAFT:       'draft',
  IN_PROGRESS: 'in_progress',
  REVIEW:      'review',
  READY:       'ready',
  PUBLISHED:   'published',
} as const;
export type EpisodeStatus = typeof EpisodeStatus[keyof typeof EpisodeStatus];

export const AssetStatus = {
  PENDING:   'pending',
  IN_REVIEW: 'in_review',
  APPROVED:  'approved',
  REJECTED:  'rejected',
} as const;
export type AssetStatus = typeof AssetStatus[keyof typeof AssetStatus];

export const PublicationStatus = {
  DRAFT:     'draft',
  SCHEDULED: 'scheduled',
  PUBLISHED: 'published',
  FAILED:    'failed',
} as const;
export type PublicationStatus = typeof PublicationStatus[keyof typeof PublicationStatus];

export const ScriptStatus = {
  PENDING:   'pending',
  MANUAL:    'manual',
  GENERATED: 'generated',
} as const;
export type ScriptStatus = typeof ScriptStatus[keyof typeof ScriptStatus];

export const SyncStatus = {
  IDLE:    'idle',
  SYNCING: 'syncing',
  SUCCESS: 'success',
  ERROR:   'error',
} as const;
export type SyncStatus = typeof SyncStatus[keyof typeof SyncStatus];

export const AudioJobStatus = {
  PENDING:    'pending',
  PROCESSING: 'processing',
  COMPLETED:  'completed',
  FAILED:     'failed',
} as const;
export type AudioJobStatus = typeof AudioJobStatus[keyof typeof AudioJobStatus];

export const KnowledgeDocStatus = {
  ACTIVE:   'active',
  ARCHIVED: 'archived',
} as const;
export type KnowledgeDocStatus = typeof KnowledgeDocStatus[keyof typeof KnowledgeDocStatus];

export const ExportPackageStatus = {
  DRAFT:     'draft',
  READY:     'ready',
  DELIVERED: 'delivered',
} as const;
export type ExportPackageStatus = typeof ExportPackageStatus[keyof typeof ExportPackageStatus];
