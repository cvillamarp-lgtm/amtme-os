-- Storage Bucket for Episode Assets
INSERT INTO storage.buckets (id, name, public, owner, created_at, updated_at)
VALUES (
  'episode-assets',
  'episode-assets',
  true,
  NULL,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy for episode-assets bucket
CREATE POLICY "Allow public read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'episode-assets');

CREATE POLICY "Allow authenticated users to upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'episode-assets' AND
    auth.role() = 'authenticated'
  );

-- Trigger function to auto-generate visual assets
CREATE OR REPLACE FUNCTION public.trigger_generate_visual_assets()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payload jsonb;
BEGIN
  -- Only generate if core_thesis is populated and visual_status is not already set
  IF NEW.core_thesis IS NOT NULL AND trim(NEW.core_thesis) != '' THEN
    v_payload := jsonb_build_object(
      'episode_id', NEW.id,
      'episode_title', NEW.title,
      'central_thesis', NEW.core_thesis,
      'theme', COALESCE(NEW.theme, 'General')
    );

    -- Call generate-visual-assets Edge Function asynchronously
    PERFORM
      net.http_post(
        url := concat(
          'https://',
          current_setting('app.supabase_url'),
          '/functions/v1/generate-visual-assets'
        ),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', concat('Bearer ', current_setting('app.supabase_anon_key'))
        ),
        body := v_payload,
        timeout_milliseconds := 300000
      );

    -- Mark that generation was triggered
    UPDATE public.episodes
    SET visual_status = 'generando'
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on INSERT
DROP TRIGGER IF EXISTS trigger_auto_generate_assets ON public.episodes;

CREATE TRIGGER trigger_auto_generate_assets
  AFTER INSERT OR UPDATE OF core_thesis ON public.episodes
  FOR EACH ROW
  WHEN (NEW.core_thesis IS NOT NULL)
  EXECUTE FUNCTION public.trigger_generate_visual_assets();

-- Notify about bucket creation
NOTIFY pgrst, 'reload schema';
