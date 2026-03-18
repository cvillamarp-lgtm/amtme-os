-- Seasons: group episodes into seasons/series

CREATE TABLE IF NOT EXISTS public.seasons (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  number      integer     NOT NULL DEFAULT 1,
  name        text        NOT NULL,
  description text,
  year        integer,
  status      text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own seasons" ON public.seasons
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER seasons_updated_at
  BEFORE UPDATE ON public.seasons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_seasons_user_number
  ON public.seasons(user_id, number DESC);

-- Add season_id to episodes
ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES public.seasons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_episodes_season_id
  ON public.episodes(season_id);
