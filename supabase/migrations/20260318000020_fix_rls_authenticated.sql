-- Fix RLS policies: change role from {public} to {authenticated} on 8 tables.
-- Previously these tables used FOR ALL TO public, which is incorrect practice.
-- auth.uid() filters rows correctly either way, but the role should be explicit.

DO $$
DECLARE
  tbl TEXT;
  pol RECORD;
BEGIN
  FOR tbl IN VALUES
    ('audience_members'),
    ('brand_assets'),
    ('episode_templates'),
    ('guests'),
    ('mentions'),
    ('metrics'),
    ('resources'),
    ('generation_history')
  LOOP
    FOR pol IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl AND roles = '{public}'
    LOOP
      EXECUTE format(
        'ALTER POLICY %I ON public.%I TO authenticated',
        pol.policyname, tbl
      );
    END LOOP;
  END LOOP;
END $$;
