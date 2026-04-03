-- Add media URL fields for Instagram/YouTube/TikTok videos and images
ALTER TABLE atomic_content
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Create index for media lookups
CREATE INDEX IF NOT EXISTS atomic_content_video_url_idx ON atomic_content(video_url) WHERE video_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS atomic_content_image_url_idx ON atomic_content(image_url) WHERE image_url IS NOT NULL;
