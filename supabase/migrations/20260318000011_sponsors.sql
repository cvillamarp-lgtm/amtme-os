-- Sponsors: manage podcast sponsors and sponsorship deals

CREATE TABLE IF NOT EXISTS public.sponsors (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  website     text,
  contact     text,
  notes       text,
  status      text        NOT NULL DEFAULT 'active' CHECK (status IN ('prospect', 'active', 'paused', 'ended')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sponsors" ON public.sponsors
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER sponsors_updated_at
  BEFORE UPDATE ON public.sponsors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sponsorship deals: link a sponsor to an episode with deal details
CREATE TABLE IF NOT EXISTS public.sponsorships (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sponsor_id  uuid        NOT NULL REFERENCES public.sponsors(id) ON DELETE CASCADE,
  episode_id  uuid        REFERENCES public.episodes(id) ON DELETE SET NULL,
  type        text        NOT NULL DEFAULT 'pre-roll' CHECK (type IN ('pre-roll', 'mid-roll', 'post-roll', 'host-read', 'segment')),
  rate        numeric(10,2),
  currency    text        NOT NULL DEFAULT 'USD',
  status      text        NOT NULL DEFAULT 'confirmed' CHECK (status IN ('prospect', 'confirmed', 'recorded', 'published', 'paid')),
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sponsorships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sponsorships" ON public.sponsorships
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER sponsorships_updated_at
  BEFORE UPDATE ON public.sponsorships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_sponsorships_sponsor_id
  ON public.sponsorships(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsorships_episode_id
  ON public.sponsorships(episode_id);
