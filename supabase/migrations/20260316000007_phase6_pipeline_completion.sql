-- ============================================================
-- Migration: Phase 6 — Full Pipeline Automation
-- Created: 2026-03-16
-- Purpose:
--   1. Add performance_score column to episodes
--   2. Migrate existing state values to new 6-state machine
--      Old → New  (estado_produccion):
--        in_progress  → draft
--        scripted     → script_ready
--        ready_to_export → assets_ready
--      Old → New  (estado_publicacion):
--        not_started → none
--        assets_ready → draft
--        packaged     → draft
--        ready        → published
--   3. Create episode_metrics_summary view (security_invoker)
-- ============================================================

-- ── 1. Add performance_score ──────────────────────────────────────────────────
ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS performance_score NUMERIC(5,2) DEFAULT NULL;

COMMENT ON COLUMN public.episodes.performance_score IS
  'Computed 0-100 score from reach + engagement + saves + shares metrics.
   Updated by automation-episode-evaluate after real metrics arrive.';

-- ── 2. State machine migration ────────────────────────────────────────────────
-- estado_produccion
UPDATE public.episodes SET estado_produccion = 'draft'
  WHERE estado_produccion = 'in_progress';

UPDATE public.episodes SET estado_produccion = 'script_ready'
  WHERE estado_produccion = 'scripted';

UPDATE public.episodes SET estado_produccion = 'assets_ready'
  WHERE estado_produccion = 'ready_to_export';

-- estado_publicacion
UPDATE public.episodes SET estado_publicacion = 'none'
  WHERE estado_publicacion = 'not_started';

UPDATE public.episodes SET estado_publicacion = 'draft'
  WHERE estado_publicacion IN ('assets_ready', 'packaged');

UPDATE public.episodes SET estado_publicacion = 'published'
  WHERE estado_publicacion = 'ready';

-- ── 3. episode_metrics_summary view ──────────────────────────────────────────
-- Aggregates metrics, publication status, and asset counts per episode.
-- Used by dashboards, editorial reports, and episode state evaluation.

CREATE OR REPLACE VIEW public.episode_metrics_summary
WITH (security_invoker = true)
AS
SELECT
  e.id                        AS episode_id,
  e.user_id,
  e.working_title             AS episode_title,
  e.number                    AS episode_number,
  e.estado_produccion,
  e.estado_publicacion,
  e.performance_score,

  -- Real metrics (non-event rows with actual values)
  COALESCE(SUM(ms.value) FILTER (WHERE ms.metric_type = 'plays'),       0) AS total_plays,
  COALESCE(SUM(ms.value) FILTER (WHERE ms.metric_type = 'reach'),       0) AS total_reach,
  COALESCE(SUM(ms.value) FILTER (WHERE ms.metric_type = 'engagement'),  0) AS total_engagement,
  COALESCE(SUM(ms.value) FILTER (WHERE ms.metric_type = 'saves'),       0) AS total_saves,
  COALESCE(SUM(ms.value) FILTER (WHERE ms.metric_type = 'shares'),      0) AS total_shares,
  COUNT(ms.id) FILTER (WHERE ms.metric_type != 'publication_event')     AS real_metric_rows,
  COUNT(ms.id) FILTER (WHERE ms.metric_type  = 'publication_event')     AS publication_events,

  -- Content counts
  COUNT(DISTINCT qc.id)                                                  AS total_quotes,
  COUNT(DISTINCT qc.id) FILTER (WHERE qc.status = 'approved')           AS approved_quotes,
  COUNT(DISTINCT ac.id) FILTER (WHERE ac.status = 'approved')           AS approved_assets,
  COUNT(DISTINCT ep2.id)                                                 AS export_packages,

  -- Publication pipeline
  COUNT(DISTINCT pq.id)                                                  AS total_publications,
  COUNT(DISTINCT pq.id) FILTER (WHERE pq.status = 'draft')              AS draft_publications,
  COUNT(DISTINCT pq.id) FILTER (WHERE pq.status = 'scheduled')          AS scheduled_publications,
  COUNT(DISTINCT pq.id) FILTER (WHERE pq.status = 'published')          AS published_publications,

  e.created_at,
  e.updated_at

FROM public.episodes e
LEFT JOIN public.metric_snapshots  ms  ON ms.episode_id  = e.id
LEFT JOIN public.quote_candidates  qc  ON qc.episode_id  = e.id
LEFT JOIN public.asset_candidates  ac  ON ac.episode_id  = e.id
LEFT JOIN public.export_packages   ep2 ON ep2.episode_id = e.id
LEFT JOIN public.publication_queue pq  ON pq.episode_id  = e.id
GROUP BY
  e.id, e.user_id, e.working_title, e.number,
  e.estado_produccion, e.estado_publicacion,
  e.performance_score, e.created_at, e.updated_at;
