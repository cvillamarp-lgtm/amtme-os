-- Historial de imágenes generadas por IA
CREATE TABLE IF NOT EXISTS public.generated_assets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  episode_id   uuid REFERENCES public.episodes(id) ON DELETE SET NULL,
  piece_id     text,    -- "portada", "reel", "slide1", etc.
  piece_name   text,    -- nombre legible de la pieza
  image_url    text NOT NULL,
  prompt       text,
  episodio_num text,    -- número del episodio como texto (ej: "EP. 14")
  source       text DEFAULT 'visual_generator', -- 'visual_generator' | 'prompt_builder'
  created_at   timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.generated_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own assets"
  ON public.generated_assets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
