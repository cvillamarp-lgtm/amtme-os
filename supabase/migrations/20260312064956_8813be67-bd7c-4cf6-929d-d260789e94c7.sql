ALTER TABLE public.episodes 
  ADD COLUMN IF NOT EXISTS idea_principal text,
  ADD COLUMN IF NOT EXISTS conflicto_central text,
  ADD COLUMN IF NOT EXISTS intencion_del_episodio text,
  ADD COLUMN IF NOT EXISTS tono text DEFAULT 'íntimo',
  ADD COLUMN IF NOT EXISTS restricciones text,
  ADD COLUMN IF NOT EXISTS generation_metadata jsonb DEFAULT '{}'::jsonb;