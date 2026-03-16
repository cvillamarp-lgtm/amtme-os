-- ============================================================
-- Migration: Automation Backend Triggers — Fase 5 (Orquestación)
-- Created: 2026-03-16
-- Purpose:
--   1. Enable pg_net for HTTP calls from SQL triggers
--   2. Helper function to call automation Edge Functions
--   3. Trigger: episodes.script → automation-script-extraction
--   4. Trigger: asset_candidates.status = 'approved' → automation-asset-publication
--   5. Trigger: publication_queue.status ∈ {scheduled,published} → automation-publication-event
--
-- ONE-TIME SETUP (run once per environment via Supabase dashboard SQL editor):
--   ALTER DATABASE postgres
--     SET app.service_role_key = '<your-service-role-key>';
--
-- Triggers silently skip if app.service_role_key is not configured.
-- Supabase URL is hardcoded since it is non-sensitive (same as config.toml project_id).
-- ============================================================

-- ── 1. Enable pg_net ─────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ── 2. Helper: call an automation Edge Function via HTTP POST ─────────────────
-- Supabase URL is hardcoded (non-sensitive).
-- Service role key is read from app.service_role_key DB setting.
-- Silently returns if the key is not configured.
CREATE OR REPLACE FUNCTION public.call_automation_ef(
  function_name TEXT,
  payload       JSONB
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _url TEXT := 'https://vudvgfdoeciurejtbzbw.supabase.co';
  _key TEXT := current_setting('app.service_role_key', true);
BEGIN
  IF _key IS NULL OR _key = '' THEN
    -- Service role key not configured — skip silently
    RETURN;
  END IF;

  PERFORM extensions.pg_net.http_post(
    url     := _url || '/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || _key
    ),
    body    := payload
  );
END;
$$;


-- ── 3. Trigger: episode script changed ───────────────────────────────────────
-- Fires when script_base or script_generated is updated on an episode.
-- Does NOT fire when only estado_produccion/estado_publicacion change
-- (prevents recursion from automation-episode-evaluate writes).

CREATE OR REPLACE FUNCTION public.trg_fn_episode_script_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (
    NEW.script_base      IS DISTINCT FROM OLD.script_base OR
    NEW.script_generated IS DISTINCT FROM OLD.script_generated
  ) THEN
    PERFORM public.call_automation_ef(
      'automation-script-extraction',
      jsonb_build_object(
        'episode_id',     NEW.id,
        'script',         COALESCE(NEW.script_generated, NEW.script_base),
        'episode_title',  NEW.working_title,
        'episode_number', NEW.number,
        'source',         'db_trigger'
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_episode_script_changed ON public.episodes;
CREATE TRIGGER trg_episode_script_changed
  AFTER UPDATE ON public.episodes
  FOR EACH ROW
  WHEN (
    NEW.script_base      IS DISTINCT FROM OLD.script_base OR
    NEW.script_generated IS DISTINCT FROM OLD.script_generated
  )
  EXECUTE FUNCTION public.trg_fn_episode_script_changed();


-- ── 4. Trigger: asset candidate approved ─────────────────────────────────────
-- Fires when an asset_candidate transitions to status = 'approved'.

CREATE OR REPLACE FUNCTION public.trg_fn_asset_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    PERFORM public.call_automation_ef(
      'automation-asset-publication',
      jsonb_build_object(
        'asset_candidate_id', NEW.id,
        'episode_id',         COALESCE(NEW.episode_id::TEXT, ''),
        'platform',           NEW.platform,
        'body_text',          NEW.body_text,
        'title',              NEW.title,
        'source',             'db_trigger'
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_asset_approved ON public.asset_candidates;
CREATE TRIGGER trg_asset_approved
  AFTER UPDATE ON public.asset_candidates
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION public.trg_fn_asset_approved();


-- ── 5. Trigger: publication queue status changed ──────────────────────────────
-- Fires when status transitions to 'scheduled' or 'published'.

CREATE OR REPLACE FUNCTION public.trg_fn_publication_status_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status IN ('scheduled', 'published') AND
     (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.call_automation_ef(
      'automation-publication-event',
      jsonb_build_object(
        'publication_queue_id', NEW.id,
        'episode_id',           NEW.episode_id,
        'platform',             NEW.platform,
        'new_status',           NEW.status,
        'source',               'db_trigger'
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_publication_status_changed ON public.publication_queue;
CREATE TRIGGER trg_publication_status_changed
  AFTER UPDATE ON public.publication_queue
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION public.trg_fn_publication_status_changed();
