-- Seed data for testing Instagram Reels publishing
-- This inserts test data into atomic_content and distribution_queue

-- Insert a test episode
INSERT INTO episodes (title, description, status, recording_date, created_by)
VALUES (
  'Test Instagram Reel Episode',
  'Testing Instagram Reels integration with atomic content publishing',
  'assets_ready',
  NOW(),
  (SELECT id FROM auth.users LIMIT 1)
)
ON CONFLICT DO NOTHING;

-- Insert test atomic content with video URL for Reels
INSERT INTO atomic_content (
  episode_id,
  headline,
  body_copy,
  cta,
  content_type,
  video_url,
  created_at,
  updated_at
)
SELECT
  e.id,
  'Test Instagram Reel: Beautiful Sunrise',
  'Witness a stunning sunrise over the mountains. Nature at its finest captured in 4K.',
  'Watch Full Episode',
  'video',
  'https://videos.pexels.com/video-files/3571028/3571028-hd_1080_1920_25fps.mp4', -- Pexels vertical video
  NOW(),
  NOW()
FROM episodes e
WHERE e.title = 'Test Instagram Reel Episode'
ON CONFLICT DO NOTHING;

-- Insert test distribution queue item for Instagram
INSERT INTO distribution_queue (
  atomic_content_id,
  episode_id,
  platforms,
  status,
  scheduled_for,
  created_at,
  updated_at
)
SELECT
  ac.id,
  ac.episode_id,
  ARRAY['instagram_reel'],
  'pending',
  NOW() - INTERVAL '5 minutes', -- Schedule for past to trigger immediately
  NOW(),
  NOW()
FROM atomic_content ac
WHERE ac.headline = 'Test Instagram Reel: Beautiful Sunrise'
AND NOT EXISTS (
  SELECT 1 FROM distribution_queue dq
  WHERE dq.atomic_content_id = ac.id
  AND 'instagram_reel' = ANY(dq.platforms)
)
ON CONFLICT DO NOTHING;
