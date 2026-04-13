-- ============================================================
-- Fix: palette_assignments RLS (no policies → all queries blocked)
-- Fix: missing FK indexes flagged by Supabase advisor
-- ============================================================

-- ── palette_assignments: add RLS policies ───────────────────────────────────
-- Table has RLS enabled (20260320000001) but zero policies, which blocks
-- every query including authenticated reads/writes.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'palette_assignments'
      AND policyname  = 'authenticated_select_palette_assignments'
  ) THEN
    EXECUTE 'CREATE POLICY "authenticated_select_palette_assignments"
      ON public.palette_assignments FOR SELECT TO authenticated USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'palette_assignments'
      AND policyname  = 'authenticated_insert_palette_assignments'
  ) THEN
    EXECUTE 'CREATE POLICY "authenticated_insert_palette_assignments"
      ON public.palette_assignments FOR INSERT TO authenticated WITH CHECK (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'palette_assignments'
      AND policyname  = 'authenticated_update_palette_assignments'
  ) THEN
    EXECUTE 'CREATE POLICY "authenticated_update_palette_assignments"
      ON public.palette_assignments FOR UPDATE TO authenticated
      USING (true) WITH CHECK (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'palette_assignments'
      AND policyname  = 'authenticated_delete_palette_assignments'
  ) THEN
    EXECUTE 'CREATE POLICY "authenticated_delete_palette_assignments"
      ON public.palette_assignments FOR DELETE TO authenticated USING (true)';
  END IF;
END $$;

-- ── Missing FK indexes ───────────────────────────────────────────────────────
-- palette_assignments
CREATE INDEX IF NOT EXISTS idx_palette_assignments_palette_id
  ON public.palette_assignments(palette_id);
CREATE INDEX IF NOT EXISTS idx_palette_assignments_created_by
  ON public.palette_assignments(created_by);

-- asset_versions
CREATE INDEX IF NOT EXISTS idx_asset_versions_palette_assignment
  ON public.asset_versions(palette_assignment_id);
CREATE INDEX IF NOT EXISTS idx_asset_versions_created_by
  ON public.asset_versions(created_by);
CREATE INDEX IF NOT EXISTS idx_asset_versions_approved_by
  ON public.asset_versions(approved_by);

-- semantic_maps
CREATE INDEX IF NOT EXISTS idx_semantic_maps_raw_input
  ON public.semantic_maps(raw_input_id);
CREATE INDEX IF NOT EXISTS idx_semantic_maps_cleaned_text
  ON public.semantic_maps(cleaned_text_id);
CREATE INDEX IF NOT EXISTS idx_semantic_maps_approved_by
  ON public.semantic_maps(approved_by);

-- cleaned_texts
CREATE INDEX IF NOT EXISTS idx_cleaned_texts_approved_by
  ON public.cleaned_texts(approved_by);

-- visual OS tables (20260319000002)
CREATE INDEX IF NOT EXISTS idx_vos_pieces_assigned_to
  ON public.visual_pieces(assigned_to);
CREATE INDEX IF NOT EXISTS idx_vos_pieces_approved_by
  ON public.visual_pieces(approved_by);
CREATE INDEX IF NOT EXISTS idx_vos_versions_created_by
  ON public.piece_versions(created_by);
CREATE INDEX IF NOT EXISTS idx_vos_exports_exported_by
  ON public.exports(exported_by);
CREATE INDEX IF NOT EXISTS idx_vos_changelog_changed_by
  ON public.change_log(changed_by);
