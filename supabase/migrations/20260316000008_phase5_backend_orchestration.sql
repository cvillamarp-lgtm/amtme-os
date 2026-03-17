-- ============================================================
-- Migration: Phase 5 — Backend Orchestration (backend-first triggers)
-- Created: 2026-03-16
-- Purpose:
--   1. Update call_automation_ef to read service role key from Supabase Vault
--      (with fallback to app.service_role_key for local dev environments).
--   2. Trigger: episodes title/theme/working_title → automation-episode-evaluate
--      Closes the gap where useEpisode.ts previously fired evaluateEpisodeCompletion
--      from the frontend when non-script fields changed.
--   3. Trigger: export_packages INSERT → automation-episode-evaluate
--      Closes the gap where no backend trigger existed for export package creation.
--
-- After this migration the following orchestration matrix is complete:
--   script_base / script_generated changed  → trg_episode_script_changed
--                                              → automation-script-extraction
--                                              → (end) automation-episode-evaluate
--   title / theme / working_title changed   → trg_episode_fields_changed (NEW)
--                                              → automation-episode-evaluate
--   asset_candidates.status → 'approved'   → trg_asset_approved
--                                              → automation-asset-publication
--                                              → (end) automation-episode-evaluate
--   publication_queue.status → scheduled/published → trg_publication_status_changed
--                                              → automation-publication-event
--                                              → (end) automation-episode-evaluate
--   export_packages INSERT                  → trg_export_package_created (NEW)
--                                              → automation-episode-evaluate
-- ============================================================


-- ── 1. Update call_automation_ef — read key from Vault with fallback ──────────
-- Vault is preferred (production). Falls back to app.service_role_key for
-- local dev / CI environments where Vault may not be available.

CREATE OR REPLACE FUNCTION public.call_automation_ef(
  function_name TEXT,
  payload       JSONB
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _url TEXT := 'https://vudvgfdoeciurejtbzbw.supabase.co';
  _key TEXT;
BEGIN
  -- Try Vault first (production path)
  BEGIN
    SELECT decrypted_secret INTO _key
    FROM vault.decrypted_secrets
    WHERE name = 'automation_service_role_key'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    _key := NULL; -- Vault not available in this environment
  END;

  -- Fall back to DB setting (local dev / CI)
  IF _key IS NULL OR _key = '' THEN
    _key := current_setting('app.service_role_key', true);
  END IF;

  IF _key IS NULL OR _key = '' THEN
    RETURN; -- Key not configured — skip silently
  END IF;

  PERFORM net.http_post(
    url     := _url || '/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || _key
    ),
    body    := payload
  );
END;
$$;


-- ── 2. Trigger: episode title/theme/working_title changed → evaluate ──────────
-- Fires when non-script editorial fields change so the state machine is
-- re-evaluated without depending on the frontend hook.
-- Does NOT fire when only estado_produccion/estado_publicacion/performance_score
-- change (those are written BY automation-episode-evaluate — no recursion).

CREATE OR REPLACE FUNCTION public.trg_fn_episode_fields_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.call_automation_ef(
    'automation-episode-evaluate',
    jsonb_build_object(
      'episode_id', NEW.id,
      'source',     'db_trigger'
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_episode_fields_changed ON public.episodes;
CREATE TRIGGER trg_episode_fields_changed
  AFTER UPDATE ON public.episodes
  FOR EACH ROW
  WHEN (
    NEW.working_title IS DISTINCT FROM OLD.working_title OR
    NEW.title         IS DISTINCT FROM OLD.title         OR
    NEW.theme         IS DISTINCT FROM OLD.theme
  )
  EXECUTE FUNCTION public.trg_fn_episode_fields_changed();


-- ── 3. Trigger: export package created → evaluate episode ─────────────────────
-- Fires on INSERT to export_packages, which moves estado_produccion to
-- 'ready_to_publish'. No frontend hook was covering this transition.

CREATE OR REPLACE FUNCTION public.trg_fn_export_package_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.episode_id IS NOT NULL THEN
    PERFORM public.call_automation_ef(
      'automation-episode-evaluate',
      jsonb_build_object(
        'episode_id', NEW.episode_id::TEXT,
        'source',     'db_trigger'
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_export_package_created ON public.export_packages;
CREATE TRIGGER trg_export_package_created
  AFTER INSERT ON public.export_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_export_package_created();
