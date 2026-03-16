-- ============================================================
-- Migration: Automation Logs v2 — Fase 4 (Observabilidad)
-- Created: 2026-03-16
-- Purpose:
--   1. Agregar run_id, skip_reason, duration_ms a automation_logs
--   2. Normalizar valores de status: ok → success, agregar started
--   3. Crear vista de lectura limpia automation_logs_view con join a episodes
-- ============================================================

-- ── 1. Columnas adicionales ─────────────────────────────────────────────────

ALTER TABLE public.automation_logs
  ADD COLUMN IF NOT EXISTS run_id      UUID    DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS skip_reason TEXT,
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER;

-- Índice para agrupar por run_id (todas las entradas de un mismo run)
CREATE INDEX IF NOT EXISTS idx_automation_logs_run_id
  ON public.automation_logs (run_id);


-- ── 2. Normalizar status: 'ok' → 'success' ─────────────────────────────────
-- Las entradas anteriores usaban 'ok'; el nuevo contrato usa 'success'
UPDATE public.automation_logs
  SET status = 'success'
  WHERE status = 'ok';


-- ── 3. Vista de lectura: automation_logs_view ────────────────────────────────
-- Join con episodes para incluir título y número del episodio.
-- La vista usa security_invoker = true para respetar el RLS del llamador.

CREATE OR REPLACE VIEW public.automation_logs_view
WITH (security_invoker = true)
AS
SELECT
  l.id,
  l.run_id,
  l.user_id,
  l.event_type,
  l.entity_type,
  l.entity_id,
  l.episode_id,
  e.working_title  AS episode_title,
  e.number         AS episode_number,
  l.status,
  l.result_summary,
  l.skip_reason,
  l.error_message,
  l.duration_ms,
  l.metadata,
  l.created_at
FROM  public.automation_logs l
LEFT JOIN public.episodes e ON e.id = l.episode_id;
