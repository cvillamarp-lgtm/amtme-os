-- Create atomic_content table for social media pieces
CREATE TABLE IF NOT EXISTS atomic_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  piece_id TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('hook', 'quote', 'clip', 'story', 'carousel')),
  platforms TEXT[] NOT NULL DEFAULT '{}', -- Array of platform targets
  headline TEXT NOT NULL,
  body_copy TEXT NOT NULL,
  cta TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 15,
  dimensions JSONB NOT NULL DEFAULT '{"width": 1080, "height": 1920}',
  source_timestamp JSONB, -- {"start": seconds, "end": seconds}
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'scheduled', 'published', 'archived')),
  published_urls JSONB DEFAULT '{}', -- {"youtube_short": "url", "tiktok": "url", ...}
  performance_metrics JSONB DEFAULT '{}', -- {"views": 0, "engagement": 0, ...}
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(episode_id, piece_id)
);

CREATE INDEX IF NOT EXISTS atomic_content_episode_id_idx ON atomic_content(episode_id);
CREATE INDEX IF NOT EXISTS atomic_content_status_idx ON atomic_content(status);
CREATE INDEX IF NOT EXISTS atomic_content_created_at_idx ON atomic_content(created_at DESC);

-- Create distribution_queue table for automation
CREATE TABLE IF NOT EXISTS distribution_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atomic_content_id UUID NOT NULL REFERENCES atomic_content(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  piece_id TEXT NOT NULL,
  platforms TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'published', 'failed', 'skipped')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS distribution_queue_status_idx ON distribution_queue(status);
CREATE INDEX IF NOT EXISTS distribution_queue_scheduled_idx ON distribution_queue(scheduled_for ASC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS distribution_queue_episode_idx ON distribution_queue(episode_id);
CREATE INDEX IF NOT EXISTS distribution_queue_atomic_content_idx ON distribution_queue(atomic_content_id);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER atomic_content_updated_at
  BEFORE UPDATE ON atomic_content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER distribution_queue_updated_at
  BEFORE UPDATE ON distribution_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Grant RLS
ALTER TABLE atomic_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies (allow authenticated users to read, admins to write)
CREATE POLICY atomic_content_select
  ON atomic_content FOR SELECT
  USING (TRUE); -- Allow anyone to select

CREATE POLICY atomic_content_insert
  ON atomic_content FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' OR
    auth.role() = 'service_role'
  );

CREATE POLICY distribution_queue_select
  ON distribution_queue FOR SELECT
  USING (TRUE);

CREATE POLICY distribution_queue_insert
  ON distribution_queue FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY distribution_queue_update
  ON distribution_queue FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
