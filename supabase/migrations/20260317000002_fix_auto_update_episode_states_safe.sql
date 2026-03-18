-- ============================================================
-- Migration: Fix auto_update_episode_states — acceso seguro a columnas
-- Created: 2026-03-17
-- Root cause:
--   auto_update_episode_states() accede a OLD.conflicto_central y
--   NEW.conflicto_central directamente. Si la columna no existe en la
--   tabla al momento de ejecutar el trigger (entorno nuevo, preview, etc.),
--   PostgreSQL lanza: "record 'old' has no field 'conflicto_central'"
--   rompiendo el UPDATE completo.
--
-- Fix:
--   1. Garantizar que conflicto_central e intencion_del_episodio existen
--      (ADD COLUMN IF NOT EXISTS — idempotente).
--   2. Reescribir auto_update_episode_states() usando to_jsonb(NEW/OLD)
--      para leer todas las columnas opcionales. to_jsonb()->>'campo'
--      devuelve NULL (nunca error) si la clave no existe en el JSON.
--   3. Recrear el trigger con la nueva función.
-- ============================================================

-- ── 1. Garantizar columnas opcionales en episodes ─────────────────────────────
ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS conflicto_central      text,
  ADD COLUMN IF NOT EXISTS intencion_del_episodio text;

-- ── 2. Reescribir la función con acceso seguro vía to_jsonb ───────────────────
CREATE OR REPLACE FUNCTION public.auto_update_episode_states()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_script_status  text;
  v_score          int  := 0;
  -- Campos opcionales leídos con seguridad vía JSONB (nunca error si falta columna)
  v_new            jsonb;
  v_old            jsonb;
  v_new_conflicto  text;
  v_old_conflicto  text;
  v_new_intencion  text;
  v_old_intencion  text;
BEGIN
  -- Convertir NEW/OLD a JSONB para acceso seguro a columnas opcionales
  v_new := to_jsonb(NEW);
  v_old := to_jsonb(OLD);

  v_new_conflicto := v_new->>'conflicto_central';
  v_old_conflicto := v_old->>'conflicto_central';
  v_new_intencion := v_new->>'intencion_del_episodio';
  v_old_intencion := v_old->>'intencion_del_episodio';

  -- Evitar bucle infinito: si solo cambian columnas de estado derivado, salir
  IF TG_OP = 'UPDATE'
    AND OLD.script_base       IS NOT DISTINCT FROM NEW.script_base
    AND OLD.script_generated  IS NOT DISTINCT FROM NEW.script_generated
    AND OLD.working_title     IS NOT DISTINCT FROM NEW.working_title
    AND OLD.theme             IS NOT DISTINCT FROM NEW.theme
    AND OLD.core_thesis       IS NOT DISTINCT FROM NEW.core_thesis
    AND OLD.hook              IS NOT DISTINCT FROM NEW.hook
    AND v_old_conflicto       IS NOT DISTINCT FROM v_new_conflicto
    AND v_old_intencion       IS NOT DISTINCT FROM v_new_intencion
    AND OLD.summary           IS NOT DISTINCT FROM NEW.summary
    AND OLD.cta               IS NOT DISTINCT FROM NEW.cta
    AND OLD.quote             IS NOT DISTINCT FROM NEW.quote
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

  -- ── Calcular health_score (10 campos × 10 pts) ────────────────────────────
  IF NEW.working_title  IS NOT NULL AND trim(NEW.working_title)  != '' THEN v_score := v_score + 1; END IF;
  IF NEW.theme          IS NOT NULL AND trim(NEW.theme)          != '' THEN v_score := v_score + 1; END IF;
  IF NEW.core_thesis    IS NOT NULL AND trim(NEW.core_thesis)    != '' THEN v_score := v_score + 1; END IF;
  IF NEW.hook           IS NOT NULL AND trim(NEW.hook)           != '' THEN v_score := v_score + 1; END IF;
  IF v_new_conflicto    IS NOT NULL AND trim(v_new_conflicto)    != '' THEN v_score := v_score + 1; END IF;
  IF v_new_intencion    IS NOT NULL AND trim(v_new_intencion)    != '' THEN v_score := v_score + 1; END IF;
  IF NEW.summary        IS NOT NULL AND trim(NEW.summary)        != '' THEN v_score := v_score + 1; END IF;
  IF NEW.cta            IS NOT NULL AND trim(NEW.cta)            != '' THEN v_score := v_score + 1; END IF;
  IF v_script_status IN ('manual', 'generated')                         THEN v_score := v_score + 1; END IF;
  IF NEW.quote          IS NOT NULL AND trim(NEW.quote)          != '' THEN v_score := v_score + 1; END IF;

  NEW.health_score      := v_score * 10;
  NEW.nivel_completitud := CASE
    WHEN v_score >= 9 THEN 'A'
    WHEN v_score >= 7 THEN 'B'
    WHEN v_score >= 5 THEN 'C'
    WHEN v_score >= 3 THEN 'D'
    ELSE                    'F'
  END;

  RETURN NEW;
END;
$$;

-- ── 3. Recrear trigger BEFORE UPDATE con columnas completas ───────────────────
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
