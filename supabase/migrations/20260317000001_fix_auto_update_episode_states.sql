-- ============================================================
-- Migration: Fix auto_update_episode_states — broken OLD.* references
-- Created: 2026-03-17
-- Root cause:
--   20260316000004_automation_layer.sql introduced a loop-prevention block
--   inside auto_update_episode_states() that references:
--
--       OLD.conflicto_central
--       OLD.intencion_del_episodio
--
--   These columns were added by earlier ALTER TABLE migrations
--   (20260312064956, 20260313120000, 20260315000001), but if those
--   migrations were not applied — or were applied in a different order —
--   the column is absent at runtime and PostgreSQL raises:
--
--       ERROR: record "old" has no field "conflicto_central"
--
--   The loop-prevention block is also LOGICALLY UNNECESSARY: the trigger
--   trg_auto_episode_states is defined as BEFORE UPDATE OF <col-list>,
--   so it only fires when one of those content columns is explicitly
--   changed. Writing derived values (script_status, health_score,
--   nivel_completitud) back to NEW does NOT fire the trigger again,
--   because those derived columns are not in the OF column-list.
--
-- Fix:
--   1. Ensure all columns referenced by the trigger / function exist.
--   2. Rewrite auto_update_episode_states() without the broken
--      OLD.* loop-prevention block.
--   3. Recreate trg_auto_episode_states so its column list is
--      consistent with the current schema.
-- ============================================================


-- ── 1. Ensure every column touched by the trigger function exists ─────────────
-- All ADD COLUMN IF NOT EXISTS are idempotent and safe to re-run.

ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS conflicto_central          TEXT,
  ADD COLUMN IF NOT EXISTS intencion_del_episodio     TEXT,
  ADD COLUMN IF NOT EXISTS working_title              TEXT,
  ADD COLUMN IF NOT EXISTS core_thesis                TEXT,
  ADD COLUMN IF NOT EXISTS script_base                TEXT,
  ADD COLUMN IF NOT EXISTS script_generated           TEXT,
  ADD COLUMN IF NOT EXISTS script_status              TEXT    DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS health_score               INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nivel_completitud          TEXT    DEFAULT 'F';


-- ── 2. Rewrite auto_update_episode_states — no broken OLD.* references ────────
--
-- Changes vs 20260316000004:
--   • Removed the entire loop-prevention IF block that accessed
--     OLD.conflicto_central / OLD.intencion_del_episodio (and other
--     columns that may be absent). The trigger's BEFORE UPDATE OF
--     column-list already prevents infinite recursion.
--   • NEW.conflicto_central / NEW.intencion_del_episodio are still used
--     in the health_score calculation — that is correct and safe because
--     those columns are now guaranteed to exist (step 1 above).

CREATE OR REPLACE FUNCTION public.auto_update_episode_states()
RETURNS TRIGGER AS $$
DECLARE
  v_script_status TEXT;
  v_score         INT := 0;
BEGIN
  -- ── Derive script_status from script content ─────────────────────────────
  IF NEW.script_generated IS NOT NULL AND length(trim(NEW.script_generated)) > 100 THEN
    v_script_status := 'generated';
  ELSIF NEW.script_base IS NOT NULL AND length(trim(NEW.script_base)) > 100 THEN
    v_script_status := 'manual';
  ELSE
    v_script_status := 'pending';
  END IF;
  NEW.script_status := v_script_status;

  -- ── Calculate health_score (10 content fields = max 100 points) ──────────
  IF NEW.working_title          IS NOT NULL AND trim(NEW.working_title)          != '' THEN v_score := v_score + 1; END IF;
  IF NEW.theme                  IS NOT NULL AND trim(NEW.theme)                  != '' THEN v_score := v_score + 1; END IF;
  IF NEW.core_thesis            IS NOT NULL AND trim(NEW.core_thesis)            != '' THEN v_score := v_score + 1; END IF;
  IF NEW.hook                   IS NOT NULL AND trim(NEW.hook)                   != '' THEN v_score := v_score + 1; END IF;
  IF NEW.conflicto_central      IS NOT NULL AND trim(NEW.conflicto_central)      != '' THEN v_score := v_score + 1; END IF;
  IF NEW.intencion_del_episodio IS NOT NULL AND trim(NEW.intencion_del_episodio) != '' THEN v_score := v_score + 1; END IF;
  IF NEW.summary                IS NOT NULL AND trim(NEW.summary)                != '' THEN v_score := v_score + 1; END IF;
  IF NEW.cta                    IS NOT NULL AND trim(NEW.cta)                    != '' THEN v_score := v_score + 1; END IF;
  IF v_script_status IN ('manual', 'generated')                                        THEN v_score := v_score + 1; END IF;
  IF NEW.quote                  IS NOT NULL AND trim(NEW.quote)                  != '' THEN v_score := v_score + 1; END IF;

  NEW.health_score := v_score * 10;  -- 0–100

  -- ── Derive nivel_completitud as an A–F grade ──────────────────────────────
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


-- ── 3. Recreate trg_auto_episode_states with the current column list ──────────
-- Drop unconditionally (it may or may not exist; DROP IF EXISTS is safe).

DROP TRIGGER IF EXISTS trg_auto_episode_states ON public.episodes;

CREATE TRIGGER trg_auto_episode_states
  BEFORE UPDATE OF
    script_base, script_generated,
    working_title, theme, core_thesis, hook,
    conflicto_central, intencion_del_episodio,
    summary, cta, quote
  ON public.episodes
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_update_episode_states();
