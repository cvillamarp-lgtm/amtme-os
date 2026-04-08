-- Fix episodes_status_check constraint to include 'draft'
-- The constraint was added out-of-band without 'draft', which the app uses as initial status.

ALTER TABLE public.episodes
  DROP CONSTRAINT IF EXISTS episodes_status_check;

ALTER TABLE public.episodes
  ADD CONSTRAINT episodes_status_check
  CHECK (status IN ('draft', 'idea', 'writing', 'recording', 'editing', 'review', 'published', 'archived'));
