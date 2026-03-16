-- ============================================================
-- Migration: Ensure episode state columns exist
-- Created: 2026-03-16
-- Purpose: The trigger trg_auto_episode_states references
--   health_score, nivel_completitud, and script_status.
--   These columns may have been created outside CLI tracking
--   (via Lovable or Supabase dashboard). This migration ensures
--   they exist so the trigger doesn't fail at runtime.
-- ============================================================

ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS health_score       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nivel_completitud  TEXT    DEFAULT 'F',
  ADD COLUMN IF NOT EXISTS script_status      TEXT    DEFAULT 'pending';
