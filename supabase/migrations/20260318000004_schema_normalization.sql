-- PR 4: Schema normalization
-- 1. Drop legacy `conflicto` boolean column — superseded by `conflicto_detectado`
-- 2. Ensure podcast_* analytics tables are in public schema

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Drop legacy conflicto boolean
-- `conflicto_detectado` (boolean) is the current field.
-- `conflicto_central`   (text)    stores the resolved conflict statement.
-- The bare `conflicto` boolean from the initial schema is unused.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.episodes DROP COLUMN IF EXISTS conflicto;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Ensure podcast analytics tables are schema-qualified in public
-- The tables were created without explicit schema in migration 20260315000007.
-- These DO blocks are safe to run multiple times.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'podcast_daily_stats'
  ) THEN
    ALTER TABLE podcast_daily_stats SET SCHEMA public;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'podcast_geo_stats'
  ) THEN
    ALTER TABLE podcast_geo_stats SET SCHEMA public;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'podcast_app_stats'
  ) THEN
    ALTER TABLE podcast_app_stats SET SCHEMA public;
  END IF;
END $$;

-- Ensure RLS policies exist with explicit schema (idempotent drops + recreates)
ALTER TABLE public.podcast_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_geo_stats   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_app_stats   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own daily stats" ON public.podcast_daily_stats;
DROP POLICY IF EXISTS "Users can manage own geo stats"  ON public.podcast_geo_stats;
DROP POLICY IF EXISTS "Users can manage own app stats"  ON public.podcast_app_stats;

CREATE POLICY "Users can manage own daily stats"
  ON public.podcast_daily_stats FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own geo stats"
  ON public.podcast_geo_stats FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own app stats"
  ON public.podcast_app_stats FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
