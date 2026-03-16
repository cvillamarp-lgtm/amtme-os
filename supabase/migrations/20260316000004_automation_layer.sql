-- ============================================================
-- Migration: Automation Layer — Fase 3
-- Created: 2026-03-16
-- Purpose: Soportar la capa de orquestación del flujo de episodio:
--   1. automation_logs — registro verificable de cada evento disparado
--   2. asset_candidate_id en publication_queue — trazabilidad asset → publicación
--   3. estado_produccion / estado_publicacion en episodes — persistir evaluación
-- ============================================================

-- ── 1. Tabla automation_logs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type      TEXT        NOT NULL,   -- 'script_saved' | 'asset_approved' | 'publication_state_changed' | 'episode_completion'
  entity_type     TEXT        NOT NULL,   -- 'episode' | 'asset_candidate' | 'publication_queue'
  entity_id       UUID,                  -- id del registro que disparó el evento
  episode_id      UUID        REFERENCES public.episodes(id) ON DELETE SET NULL,
  status          TEXT        NOT NULL DEFAULT 'ok',  -- 'ok' | 'error' | 'skipped'
  result_summary  TEXT,
  error_message   TEXT,
  metadata        JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices útiles para debugging y auditoría
CREATE INDEX IF NOT EXISTS idx_automation_logs_episode_id   ON public.automation_logs (episode_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_event_type   ON public.automation_logs (event_type);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created_at   ON public.automation_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_logs_status       ON public.automation_logs (status) WHERE status = 'error';

-- RLS: cada usuario solo ve sus propios logs
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "automation_logs_select_own"
  ON public.automation_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "automation_logs_insert_own"
  ON public.automation_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ── 2. asset_candidate_id en publication_queue ──────────────────────────────
ALTER TABLE public.publication_queue
  ADD COLUMN IF NOT EXISTS asset_candidate_id UUID
    REFERENCES public.asset_candidates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_publication_queue_asset_candidate
  ON public.publication_queue (asset_candidate_id)
  WHERE asset_candidate_id IS NOT NULL;


-- ── 3. Estado de producción y publicación en episodes ───────────────────────
-- Columnas para persistir la evaluación automática de completitud
ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS estado_produccion  TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS estado_publicacion TEXT DEFAULT 'not_started';

-- Asegurar que el trigger de estados no ignore estas columnas cuando se actualizan
-- (ya existe en la migración 20260316000002; solo agregamos la protección de bucle)
CREATE OR REPLACE FUNCTION public.auto_update_episode_states()
RETURNS TRIGGER AS $$
DECLARE
  v_script_status TEXT;
  v_score         INT := 0;
BEGIN
  -- Evitar bucle infinito: si solo cambian las columnas de estado derivado, no re-derivar
  IF TG_OP = 'UPDATE'
    AND OLD.script_base IS NOT DISTINCT FROM NEW.script_base
    AND OLD.script_generated IS NOT DISTINCT FROM NEW.script_generated
    AND OLD.working_title IS NOT DISTINCT FROM NEW.working_title
    AND OLD.theme IS NOT DISTINCT FROM NEW.theme
    AND OLD.core_thesis IS NOT DISTINCT FROM NEW.core_thesis
    AND OLD.hook IS NOT DISTINCT FROM NEW.hook
    AND OLD.conflicto_central IS NOT DISTINCT FROM NEW.conflicto_central
    AND OLD.intencion_del_episodio IS NOT DISTINCT FROM NEW.intencion_del_episodio
    AND OLD.summary IS NOT DISTINCT FROM NEW.summary
    AND OLD.cta IS NOT DISTINCT FROM NEW.cta
    AND OLD.quote IS NOT DISTINCT FROM NEW.quote
  THEN
    RETURN NEW;
  END IF;

  -- ── Derivar script_status ─────────────────────────────────────────────────
  IF NEW.script_generated IS NOT NULL AND length(trim(NEW.script_generated)) > 100 THEN
    v_script_status := 'generated';
  ELSIF NEW.script_base IS NOT NULL AND length(trim(NEW.script_base)) > 100 THEN
    v_script_status := 'manual';
  ELSE
    v_script_status := 'pending';
  END IF;
  NEW.script_status := v_script_status;

  -- ── Calcular health_score ─────────────────────────────────────────────────
  IF NEW.working_title          IS NOT NULL AND trim(NEW.working_title)          != '' THEN v_score := v_score + 1; END IF;
  IF NEW.theme                  IS NOT NULL AND trim(NEW.theme)                  != '' THEN v_score := v_score + 1; END IF;
  IF NEW.core_thesis            IS NOT NULL AND trim(NEW.core_thesis)            != '' THEN v_score := v_score + 1; END IF;
  IF NEW.hook                   IS NOT NULL AND trim(NEW.hook)                   != '' THEN v_score := v_score + 1; END IF;
  IF NEW.conflicto_central      IS NOT NULL AND trim(NEW.conflicto_central)      != '' THEN v_score := v_score + 1; END IF;
  IF NEW.intencion_del_episodio IS NOT NULL AND trim(NEW.intencion_del_episodio) != '' THEN v_score := v_score + 1; END IF;
  IF NEW.summary                IS NOT NULL AND trim(NEW.summary)                != '' THEN v_score := v_score + 1; END IF;
  IF NEW.cta                    IS NOT NULL AND trim(NEW.cta)                    != '' THEN v_score := v_score + 1; END IF;
  IF v_script_status IN ('manual', 'generated')                                         THEN v_score := v_score + 1; END IF;
  IF NEW.quote                  IS NOT NULL AND trim(NEW.quote)                  != '' THEN v_score := v_score + 1; END IF;

  NEW.health_score := v_score * 10;

  -- ── Derivar nivel_completitud ─────────────────────────────────────────────
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
