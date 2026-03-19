-- ============================================================
-- Storage: ensure buckets exist + RLS policies
-- ============================================================

-- 1. Bucket: generated-images (ya existe probablemente, usar upsert)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'generated-images',
  'generated-images',
  true,
  10485760,
  ARRAY['image/png','image/jpeg','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

-- 2. Bucket: episode-covers (para covers de episodios)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'episode-covers',
  'episode-covers',
  true,
  10485760,
  ARRAY['image/png','image/jpeg','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Bucket: audio-uploads (para archivos de audio)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio-uploads',
  'audio-uploads',
  false,
  524288000,
  ARRAY['audio/mpeg','audio/wav','audio/mp4','audio/ogg','audio/aac','audio/flac']
)
ON CONFLICT (id) DO NOTHING;

-- 4. Bucket: exports (para ZIPs de assets)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
  'exports',
  'exports',
  false,
  104857600
)
ON CONFLICT (id) DO NOTHING;

-- ── RLS Policies: generated-images ────────────────────────────────────────────
-- Drop existing to avoid conflicts
DROP POLICY IF EXISTS "authenticated_select_generated_images" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_insert_generated_images" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_update_generated_images" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_delete_generated_images" ON storage.objects;

CREATE POLICY "authenticated_select_generated_images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'generated-images');

CREATE POLICY "authenticated_insert_generated_images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'generated-images' AND auth.role() = 'authenticated');

CREATE POLICY "authenticated_update_generated_images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'generated-images' AND auth.role() = 'authenticated');

CREATE POLICY "authenticated_delete_generated_images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'generated-images' AND auth.uid() = owner);

-- ── RLS Policies: episode-covers ──────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_select_episode_covers" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_insert_episode_covers" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_update_episode_covers" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_delete_episode_covers" ON storage.objects;

CREATE POLICY "authenticated_select_episode_covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'episode-covers');

CREATE POLICY "authenticated_insert_episode_covers"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'episode-covers' AND auth.role() = 'authenticated');

CREATE POLICY "authenticated_update_episode_covers"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'episode-covers' AND auth.role() = 'authenticated');

CREATE POLICY "authenticated_delete_episode_covers"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'episode-covers' AND auth.uid() = owner);

-- ── RLS Policies: audio-uploads ───────────────────────────────────────────────
DROP POLICY IF EXISTS "owner_select_audio_uploads" ON storage.objects;
DROP POLICY IF EXISTS "owner_insert_audio_uploads" ON storage.objects;
DROP POLICY IF EXISTS "owner_update_audio_uploads" ON storage.objects;
DROP POLICY IF EXISTS "owner_delete_audio_uploads" ON storage.objects;

CREATE POLICY "owner_select_audio_uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'audio-uploads' AND auth.uid() = owner);

CREATE POLICY "owner_insert_audio_uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'audio-uploads' AND auth.role() = 'authenticated');

CREATE POLICY "owner_update_audio_uploads"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'audio-uploads' AND auth.uid() = owner);

CREATE POLICY "owner_delete_audio_uploads"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'audio-uploads' AND auth.uid() = owner);

-- ── RLS Policies: exports ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "owner_select_exports" ON storage.objects;
DROP POLICY IF EXISTS "owner_insert_exports" ON storage.objects;
DROP POLICY IF EXISTS "owner_delete_exports" ON storage.objects;

CREATE POLICY "owner_select_exports"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'exports' AND auth.uid() = owner);

CREATE POLICY "owner_insert_exports"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'exports' AND auth.role() = 'authenticated');

CREATE POLICY "owner_delete_exports"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'exports' AND auth.uid() = owner);
