-- ============================================================
-- Migration: Orchestration Triggers — Fase 2
-- Created: 2026-03-16
-- Purpose: Reducir fricción operativa con orquestación automática:
--   A) Auto-crear draft de publicación cuando un asset se aprueba
--   B) Auto-derivar script_status, nivel_completitud y health_score del episodio
-- ============================================================

-- ── Track A: Auto-publicación desde asset aprobado ─────────────────────────

-- Función utilitaria: inferir plataforma de distribución desde el nombre de la pieza
CREATE OR REPLACE FUNCTION public.infer_platform_from_piece(piece_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE
    WHEN piece_name ILIKE '%reel%'                              THEN 'instagram_reel'
    WHEN piece_name ILIKE '%story%'                             THEN 'instagram_story'
    WHEN piece_name ILIKE '%tiktok%'                            THEN 'tiktok'
    WHEN piece_name ILIKE '%youtube%' OR piece_name ILIKE '%yt%' THEN 'youtube'
    ELSE 'instagram_feed'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Función trigger: INSERT automático en publications cuando un asset pasa a 'approved'
CREATE OR REPLACE FUNCTION public.auto_create_publication_on_asset_approve()
RETURNS TRIGGER AS $$
BEGIN
  -- Disparar solo cuando status cambia A 'approved' (UPDATE) o se inserta ya en 'approved'
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'approved' AND NEW.status = 'approved')
  OR (TG_OP = 'INSERT' AND NEW.status = 'approved')
  THEN
    -- Idempotente: solo crea si no existe ya una publicación para este asset
    IF NOT EXISTS (
      SELECT 1 FROM public.publications WHERE asset_id = NEW.id
    ) THEN
      INSERT INTO public.publications (
        user_id,
        episode_id,
        asset_id,
        platform,
        copy_final,
        status,
        checklist_json
      ) VALUES (
        NEW.user_id,
        NEW.episode_id,
        NEW.id,
        public.infer_platform_from_piece(COALESCE(NEW.piece_name, '')),
        NEW.caption,        -- hereda caption del asset como copy inicial
        'draft',
        '[]'::jsonb
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Crear trigger solo si la tabla content_assets existe (puede haber sido creada
-- fuera del tracking de migraciones del CLI)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'content_assets'
  ) THEN
    -- Idempotente: elimina si ya existe antes de recrear
    IF EXISTS (
      SELECT 1 FROM information_schema.triggers
      WHERE trigger_schema = 'public'
        AND event_object_table = 'content_assets'
        AND trigger_name = 'trg_auto_publication_on_asset_approve'
    ) THEN
      EXECUTE 'DROP TRIGGER trg_auto_publication_on_asset_approve ON public.content_assets';
    END IF;

    EXECUTE '
      CREATE TRIGGER trg_auto_publication_on_asset_approve
        AFTER INSERT OR UPDATE OF status ON public.content_assets
        FOR EACH ROW
        EXECUTE FUNCTION public.auto_create_publication_on_asset_approve()
    ';
  END IF;
END $$;


-- ── Track B: Estados automáticos del episodio ──────────────────────────────

-- Función trigger: deriva script_status, nivel_completitud y health_score
-- Se ejecuta BEFORE UPDATE para que los valores queden en el mismo row guardado
CREATE OR REPLACE FUNCTION public.auto_update_episode_states()
RETURNS TRIGGER AS $$
DECLARE
  v_script_status TEXT;
  v_score         INT := 0;
BEGIN
  -- ── Derivar script_status desde contenido del guión ──────────────────────
  IF NEW.script_generated IS NOT NULL AND length(trim(NEW.script_generated)) > 100 THEN
    v_script_status := 'generated';
  ELSIF NEW.script_base IS NOT NULL AND length(trim(NEW.script_base)) > 100 THEN
    v_script_status := 'manual';
  ELSE
    v_script_status := 'pending';
  END IF;
  NEW.script_status := v_script_status;

  -- ── Calcular health_score (10 campos = 100 puntos posibles) ──────────────
  IF NEW.working_title           IS NOT NULL AND trim(NEW.working_title)           != '' THEN v_score := v_score + 1; END IF;
  IF NEW.theme                   IS NOT NULL AND trim(NEW.theme)                   != '' THEN v_score := v_score + 1; END IF;
  IF NEW.core_thesis             IS NOT NULL AND trim(NEW.core_thesis)             != '' THEN v_score := v_score + 1; END IF;
  IF NEW.hook                    IS NOT NULL AND trim(NEW.hook)                    != '' THEN v_score := v_score + 1; END IF;
  IF NEW.conflicto_central       IS NOT NULL AND trim(NEW.conflicto_central)       != '' THEN v_score := v_score + 1; END IF;
  IF NEW.intencion_del_episodio  IS NOT NULL AND trim(NEW.intencion_del_episodio)  != '' THEN v_score := v_score + 1; END IF;
  IF NEW.summary                 IS NOT NULL AND trim(NEW.summary)                 != '' THEN v_score := v_score + 1; END IF;
  IF NEW.cta                     IS NOT NULL AND trim(NEW.cta)                     != '' THEN v_score := v_score + 1; END IF;
  IF v_script_status IN ('manual', 'generated')                                          THEN v_score := v_score + 1; END IF;
  IF NEW.quote                   IS NOT NULL AND trim(NEW.quote)                   != '' THEN v_score := v_score + 1; END IF;

  NEW.health_score := v_score * 10;  -- 0-100

  -- ── Derivar nivel_completitud como grade A-F ──────────────────────────────
  NEW.nivel_completitud := CASE
    WHEN v_score >= 9 THEN 'A'
    WHEN v_score >= 7 THEN 'B'
    WHEN v_score >= 5 THEN 'C'
    WHEN v_score >= 3 THEN 'D'
    ELSE                    'F'
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger BEFORE UPDATE — solo en columnas de contenido (evita bucles infinitos)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'episodes'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.triggers
      WHERE trigger_schema = 'public'
        AND event_object_table = 'episodes'
        AND trigger_name = 'trg_auto_episode_states'
    ) THEN
      EXECUTE 'DROP TRIGGER trg_auto_episode_states ON public.episodes';
    END IF;

    EXECUTE '
      CREATE TRIGGER trg_auto_episode_states
        BEFORE UPDATE OF
          script_base, script_generated,
          working_title, theme, core_thesis, hook,
          conflicto_central, intencion_del_episodio,
          summary, cta, quote
        ON public.episodes
        FOR EACH ROW
        EXECUTE FUNCTION public.auto_update_episode_states()
    ';
  END IF;
END $$;
