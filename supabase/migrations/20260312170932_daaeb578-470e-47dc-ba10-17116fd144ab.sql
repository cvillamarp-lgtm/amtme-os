ALTER TABLE public.episodes 
ADD COLUMN IF NOT EXISTS block_states jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS version_history jsonb DEFAULT '{}'::jsonb;