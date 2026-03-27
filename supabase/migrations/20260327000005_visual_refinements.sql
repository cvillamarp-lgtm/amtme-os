-- Table for storing visual refinement records
CREATE TABLE IF NOT EXISTS public.visual_refinements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id      uuid REFERENCES public.episodes(id) ON DELETE CASCADE NOT NULL,
  original_image_url text NOT NULL,
  refined_image_url text NOT NULL,
  intensity       text NOT NULL DEFAULT 'media', -- 'sutil', 'media', 'alta'
  focus           text NOT NULL DEFAULT 'integral', -- 'fondo', 'composicion', 'legibilidad', 'acabado', 'integral'
  analysis        jsonb,
  status          text DEFAULT 'completed', -- 'processing', 'completed', 'failed'
  created_at      timestamptz DEFAULT now() NOT NULL,
  updated_at      timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_visual_refinements_episode ON public.visual_refinements(episode_id);
CREATE INDEX IF NOT EXISTS idx_visual_refinements_created ON public.visual_refinements(created_at DESC);

ALTER TABLE public.visual_refinements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view refinements of their episodes"
  ON public.visual_refinements FOR SELECT
  USING (
    episode_id IN (
      SELECT id FROM public.episodes WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create refinements for their episodes"
  ON public.visual_refinements FOR INSERT
  WITH CHECK (
    episode_id IN (
      SELECT id FROM public.episodes WHERE user_id = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';
