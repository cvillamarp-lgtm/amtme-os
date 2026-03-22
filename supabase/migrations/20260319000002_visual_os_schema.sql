-- ─────────────────────────────────────────────────────────────────────────────
-- AMTME Visual OS — Schema
-- 13 new tables for the visual production system
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Extend episodes ──────────────────────────────────────────────────────────
ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS thesis_central  text,
  ADD COLUMN IF NOT EXISTS visual_notes    text,
  ADD COLUMN IF NOT EXISTS visual_status   text DEFAULT 'sin_iniciar';
  -- visual_status: sin_iniciar | en_produccion | en_revision | completado

-- ─── episode_key_phrases ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.episode_key_phrases (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  episode_id  uuid REFERENCES public.episodes(id) ON DELETE CASCADE NOT NULL,
  phrase      text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- ─── brand_tokens ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.brand_tokens (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  token_type  text NOT NULL,   -- 'color' | 'typography' | 'rule'
  token_name  text NOT NULL,
  token_value text NOT NULL,
  label       text,
  is_active   boolean DEFAULT true NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL,
  UNIQUE (token_type, token_name)
);

-- ─── host_assets ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.host_assets (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  label       text NOT NULL,
  asset_url   text NOT NULL,
  asset_type  text NOT NULL DEFAULT 'photo',  -- 'photo' | 'illustration' | 'logo'
  is_primary  boolean DEFAULT false NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- ─── visual_system_settings ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.visual_system_settings (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key         text NOT NULL UNIQUE,
  value_json  jsonb NOT NULL DEFAULT '{}',
  label       text,
  updated_at  timestamptz DEFAULT now() NOT NULL,
  updated_by  uuid REFERENCES auth.users(id)
);

-- ─── visual_templates ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.visual_templates (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  piece_code        text NOT NULL UNIQUE,   -- 'P01'..'P15'
  piece_name        text NOT NULL,
  width_px          integer NOT NULL,
  height_px         integer NOT NULL,
  format            text NOT NULL,           -- '1:1' | '4:5' | '9:16'
  safe_zone_top     integer NOT NULL DEFAULT 80,
  safe_zone_right   integer NOT NULL DEFAULT 80,
  safe_zone_bottom  integer NOT NULL DEFAULT 80,
  safe_zone_left    integer NOT NULL DEFAULT 80,
  production_order  integer NOT NULL,
  background_color  text NOT NULL DEFAULT '#193497',
  composition_notes text,
  is_active         boolean DEFAULT true NOT NULL,
  created_at        timestamptz DEFAULT now() NOT NULL
);

-- ─── visual_template_rules ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.visual_template_rules (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id     uuid REFERENCES public.visual_templates(id) ON DELETE CASCADE NOT NULL,
  rule_type       text NOT NULL,  -- 'copy_block' | 'visual' | 'composition'
  rule_key        text NOT NULL,
  rule_value_json jsonb NOT NULL DEFAULT '{}',
  is_required     boolean DEFAULT false NOT NULL,
  order_index     integer NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now() NOT NULL
);

-- ─── visual_pieces ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.visual_pieces (
  id                 uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  episode_id         uuid REFERENCES public.episodes(id) ON DELETE CASCADE NOT NULL,
  template_id        uuid REFERENCES public.visual_templates(id) NOT NULL,
  piece_status       text NOT NULL DEFAULT 'borrador',
  -- borrador | en_revision | corregir | aprobado | exportado | publicado
  assigned_to        uuid REFERENCES auth.users(id),
  approved_by        uuid REFERENCES auth.users(id),
  current_version_id uuid,   -- FK added after piece_versions exists
  validation_score   integer DEFAULT 0,
  preview_data_url   text,   -- latest canvas preview (base64, transient)
  created_at         timestamptz DEFAULT now() NOT NULL,
  updated_at         timestamptz DEFAULT now() NOT NULL,
  UNIQUE (episode_id, template_id)
);

-- ─── piece_copy_blocks ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.piece_copy_blocks (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  piece_id    uuid REFERENCES public.visual_pieces(id) ON DELETE CASCADE NOT NULL,
  block_name  text NOT NULL,
  block_value text NOT NULL DEFAULT '',
  is_fixed    boolean DEFAULT false NOT NULL,   -- system value, not user-editable
  order_index integer NOT NULL DEFAULT 0,
  updated_at  timestamptz DEFAULT now() NOT NULL,
  UNIQUE (piece_id, block_name)
);

-- ─── piece_versions ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.piece_versions (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  piece_id         uuid REFERENCES public.visual_pieces(id) ON DELETE CASCADE NOT NULL,
  version_number   integer NOT NULL,
  payload_json     jsonb NOT NULL DEFAULT '{}',  -- snapshot: copy blocks + meta
  preview_url      text,
  export_url       text,
  validation_score integer DEFAULT 0,
  change_reason    text,
  created_by       uuid REFERENCES auth.users(id),
  created_at       timestamptz DEFAULT now() NOT NULL
);

-- FK back to visual_pieces (deferred to avoid chicken-and-egg)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vos_pieces_current_version_fk'
  ) THEN
    ALTER TABLE public.visual_pieces
      ADD CONSTRAINT vos_pieces_current_version_fk
      FOREIGN KEY (current_version_id) REFERENCES public.piece_versions(id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

-- ─── approval_checks ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.approval_checks (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  piece_version_id uuid REFERENCES public.piece_versions(id) ON DELETE CASCADE NOT NULL,
  check_id         text NOT NULL,
  check_name       text NOT NULL,
  severity         text NOT NULL DEFAULT 'critico',  -- 'critico' | 'advertencia'
  check_result     boolean NOT NULL DEFAULT false,
  details          text,
  rule_ref         text,   -- §01-A etc.
  created_at       timestamptz DEFAULT now() NOT NULL
);

-- ─── exports ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exports (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  piece_version_id uuid REFERENCES public.piece_versions(id) ON DELETE CASCADE NOT NULL,
  export_type      text NOT NULL DEFAULT 'png',   -- 'png' | 'jpg' | 'json'
  file_url         text,
  file_name        text NOT NULL,
  is_final         boolean DEFAULT false NOT NULL,
  exported_by      uuid REFERENCES auth.users(id),
  exported_at      timestamptz DEFAULT now() NOT NULL
);

-- ─── change_log ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.change_log (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type    text NOT NULL,  -- 'episode' | 'visual_piece' | 'copy_block' | 'version'
  entity_id      uuid NOT NULL,
  action_type    text NOT NULL,  -- 'create' | 'update' | 'approve' | 'export' | 'restore' | 'status_change'
  changed_by     uuid REFERENCES auth.users(id),
  change_summary text,
  diff_json      jsonb,
  created_at     timestamptz DEFAULT now() NOT NULL
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vos_pieces_episode    ON public.visual_pieces(episode_id);
CREATE INDEX IF NOT EXISTS idx_vos_pieces_template   ON public.visual_pieces(template_id);
CREATE INDEX IF NOT EXISTS idx_vos_pieces_status     ON public.visual_pieces(piece_status);
CREATE INDEX IF NOT EXISTS idx_vos_copy_piece        ON public.piece_copy_blocks(piece_id);
CREATE INDEX IF NOT EXISTS idx_vos_versions_piece    ON public.piece_versions(piece_id);
CREATE INDEX IF NOT EXISTS idx_vos_approval_version  ON public.approval_checks(piece_version_id);
CREATE INDEX IF NOT EXISTS idx_vos_exports_version   ON public.exports(piece_version_id);
CREATE INDEX IF NOT EXISTS idx_vos_changelog_entity  ON public.change_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_vos_keyphrases_ep     ON public.episode_key_phrases(episode_id);

-- ─── updated_at trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_vos_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_visual_pieces_updated_at ON public.visual_pieces;
CREATE TRIGGER trg_visual_pieces_updated_at
  BEFORE UPDATE ON public.visual_pieces
  FOR EACH ROW EXECUTE FUNCTION update_vos_updated_at();

DROP TRIGGER IF EXISTS trg_piece_copy_updated_at ON public.piece_copy_blocks;
CREATE TRIGGER trg_piece_copy_updated_at
  BEFORE UPDATE ON public.piece_copy_blocks
  FOR EACH ROW EXECUTE FUNCTION update_vos_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'episode_key_phrases','brand_tokens','host_assets','visual_system_settings',
    'visual_templates','visual_template_rules','visual_pieces','piece_copy_blocks',
    'piece_versions','approval_checks','exports','change_log'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND policyname = format('vos_sel_%s', t)
    ) THEN
      EXECUTE format(
        'CREATE POLICY "vos_sel_%s" ON public.%I FOR SELECT TO authenticated USING (true)', t, t);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND policyname = format('vos_ins_%s', t)
    ) THEN
      EXECUTE format(
        'CREATE POLICY "vos_ins_%s" ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', t, t);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND policyname = format('vos_upd_%s', t)
    ) THEN
      EXECUTE format(
        'CREATE POLICY "vos_upd_%s" ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t, t);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND policyname = format('vos_del_%s', t)
    ) THEN
      EXECUTE format(
        'CREATE POLICY "vos_del_%s" ON public.%I FOR DELETE TO authenticated USING (true)', t, t);
    END IF;
  END LOOP;
END $$;
