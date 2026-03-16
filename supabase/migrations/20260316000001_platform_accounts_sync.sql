-- ============================================================
-- Migration: Platform Account Sync Tracking
-- Created: 2026-03-16
-- Purpose: Track sync status for OAuth-connected platform accounts
-- ============================================================

ALTER TABLE public.platform_accounts
  ADD COLUMN IF NOT EXISTS synced_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sync_status  TEXT DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS sync_error   TEXT;

-- Optional: constrain valid sync_status values
ALTER TABLE public.platform_accounts
  ADD CONSTRAINT platform_accounts_sync_status_check
  CHECK (sync_status IN ('idle', 'syncing', 'success', 'error'));
