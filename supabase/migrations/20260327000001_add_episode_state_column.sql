-- Migration: Add missing episode_state column
-- Issue: auto_update_episode_states() trigger was trying to set NEW.episode_state
--        but the column didn't exist in the episodes table
-- Solution: Add the column with default 'ideated' and populate existing records

ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS episode_state text DEFAULT 'ideated';

-- Populate existing episodes based on their completeness
UPDATE public.episodes
  SET episode_state = CASE
    WHEN script_generated IS NOT NULL AND trim(script_generated) != '' THEN 'scripted'
    WHEN script_base IS NOT NULL AND trim(script_base) != '' THEN 'scripted'
    WHEN working_title IS NOT NULL AND trim(working_title) != '' 
         AND conflicto_central IS NOT NULL THEN 'structured'
    WHEN working_title IS NOT NULL AND trim(working_title) != '' THEN 'drafted'
    ELSE 'ideated'
  END
  WHERE episode_state IS NULL;

-- Create index for fast queries
CREATE INDEX IF NOT EXISTS idx_episodes_episode_state ON public.episodes(episode_state);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
