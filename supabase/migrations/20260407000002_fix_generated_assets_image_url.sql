-- generated_assets.image_url was NOT NULL but script engine outputs are JSON, not images.
-- Make it nullable so the script engine can insert without an image_url.
ALTER TABLE public.generated_assets
  ALTER COLUMN image_url DROP NOT NULL;
