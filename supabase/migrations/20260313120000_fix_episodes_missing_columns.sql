-- Fix: Add all potentially missing columns to episodes table
-- Uses IF NOT EXISTS so it's safe to run even if columns already exist

ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS idea_principal        text,
  ADD COLUMN IF NOT EXISTS conflicto_central     text,
  ADD COLUMN IF NOT EXISTS intencion_del_episodio text,
  ADD COLUMN IF NOT EXISTS tono                  text DEFAULT 'íntimo',
  ADD COLUMN IF NOT EXISTS restricciones         text,
  ADD COLUMN IF NOT EXISTS generation_metadata   jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS block_states          jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS version_history       jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS script_base           text,
  ADD COLUMN IF NOT EXISTS script_generated      text,
  ADD COLUMN IF NOT EXISTS script_status         text,
  ADD COLUMN IF NOT EXISTS distribution_status   text,
  ADD COLUMN IF NOT EXISTS editing_status        text,
  ADD COLUMN IF NOT EXISTS recording_status      text,
  ADD COLUMN IF NOT EXISTS duration              text;
