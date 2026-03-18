-- Track which AI-generated options users applied per episode field
CREATE TABLE IF NOT EXISTS public.episode_block_versions (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  episode_id  uuid        NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  field_name  text        NOT NULL,
  value       text        NOT NULL,
  source      text        NOT NULL DEFAULT 'ai_option',
  applied_at  timestamptz DEFAULT now(),
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.episode_block_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own episode block versions"
  ON public.episode_block_versions
  FOR ALL
  TO authenticated
  USING (
    episode_id IN (
      SELECT id FROM public.episodes WHERE user_id = auth.uid()
    )
  );
