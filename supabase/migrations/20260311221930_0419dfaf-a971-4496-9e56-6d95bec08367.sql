
-- Indexes for content_assets performance
CREATE INDEX IF NOT EXISTS idx_content_assets_user_id ON public.content_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_content_assets_episode_id ON public.content_assets(episode_id);
CREATE INDEX IF NOT EXISTS idx_content_assets_status ON public.content_assets(status);

-- Unique constraint for upsert (prevents duplicates per user+piece+episode)
ALTER TABLE public.content_assets ADD CONSTRAINT content_assets_user_piece_episode_unique UNIQUE (user_id, piece_id, episode_id);
