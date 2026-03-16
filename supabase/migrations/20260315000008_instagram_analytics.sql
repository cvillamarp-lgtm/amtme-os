-- ============================================================
-- Migration: Instagram Analytics Tables
-- Created: 2026-03-15
-- Purpose: Store Instagram account stats and media insights
-- ============================================================

-- Daily account-level metrics (followers, reach, impressions)
CREATE TABLE IF NOT EXISTS public.instagram_account_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    fecha DATE NOT NULL,
    followers INTEGER,
    reach INTEGER,
    impressions INTEGER,
    profile_views INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, fecha)
);

-- Per-post media insights
CREATE TABLE IF NOT EXISTS public.instagram_media_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    ig_media_id TEXT NOT NULL,
    ig_permalink TEXT,
    caption TEXT,
    media_type TEXT,
    thumbnail_url TEXT,
    posted_at TIMESTAMPTZ,
    reach INTEGER,
    impressions INTEGER,
    likes INTEGER,
    comments INTEGER,
    saves INTEGER,
    shares INTEGER,
    episode_id UUID REFERENCES public.episodes(id) ON DELETE SET NULL,
    fetched_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, ig_media_id)
);

-- RLS
ALTER TABLE public.instagram_account_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_media_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own instagram_account_stats"
    ON public.instagram_account_stats FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users manage own instagram_media_stats"
    ON public.instagram_media_stats FOR ALL
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_ig_account_stats_user ON public.instagram_account_stats(user_id, fecha DESC);
CREATE INDEX idx_ig_media_stats_user ON public.instagram_media_stats(user_id, posted_at DESC);
CREATE INDEX idx_ig_media_stats_episode ON public.instagram_media_stats(episode_id) WHERE episode_id IS NOT NULL;

-- Auto-update trigger for fetched_at
CREATE TRIGGER instagram_media_stats_fetched_at
    BEFORE UPDATE ON public.instagram_media_stats
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
