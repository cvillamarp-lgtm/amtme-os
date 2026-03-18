-- ============================================================
-- Migration: Fix call_automation_ef overloads (root cause fix)
-- Created: 2026-03-17
-- Root cause:
--   1. Multiple overloads of public.call_automation_ef exist in the DB
--      (prior CREATE OR REPLACE with a different first-arg type/name left ghost
--       overloads — PostgreSQL only replaces when signature matches exactly).
--   2. Trigger functions pass string literals typed as `unknown` which makes
--      PostgreSQL refuse to resolve the overload (ambiguity error).
--   3. extensions.pg_net.http_post is the wrong schema path; correct is net.http_post.
--
-- Fix:
--   1. Drop ALL overloads of call_automation_ef via catalog query (no hardcoding).
--   2. Recreate ONE canonical: call_automation_ef(event_type text, payload jsonb)
--      - uses net.http_post (correct schema path)
--      - EXCEPTION block that logs to automation_logs and never raises
--   3. Rewrite all 5 trigger functions to cast first arg as ::text (eliminates unknown).
-- ============================================================

-- ── 1. Drop ALL existing overloads of call_automation_ef ─────────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT oid::regprocedure::text AS sig
    FROM   pg_proc
    WHERE  proname      = 'call_automation_ef'
    AND    pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
  END LOOP;
END $$;

-- ── 2. Canonical function: one signature, safe HTTP call, never raises ────────
CREATE FUNCTION public.call_automation_ef(
  event_type text,
  payload    jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _url  text := 'https://vudvgfdoeciurejtbzbw.supabase.co';
  _key  text;
BEGIN
  -- Try Vault first (production)
  BEGIN
    SELECT decrypted_secret INTO _key
    FROM   vault.decrypted_secrets
    WHERE  name = 'automation_service_role_key'
    LIMIT  1;
  EXCEPTION WHEN OTHERS THEN
    _key := NULL;
  END;

  -- Fallback to DB setting (local dev / CI)
  IF _key IS NULL OR _key = '' THEN
    _key := current_setting('app.service_role_key', true);
  END IF;

  IF _key IS NULL OR _key = '' THEN
    RETURN;  -- not configured → skip silently
  END IF;

  PERFORM net.http_post(
    url     := _url || '/functions/v1/' || event_type,
    body    := payload,
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || _key
               )
  );

EXCEPTION WHEN OTHERS THEN
  -- Never break the parent transaction — log and continue
  BEGIN
    INSERT INTO public.automation_logs (
      event_type, entity_type, entity_id, episode_id,
      status, error_message, metadata
    ) VALUES (
      event_type, 'trigger', NULL, (payload->>'episode_id')::uuid,
      'error', SQLERRM,
      jsonb_build_object('payload', payload, 'sqlstate', SQLSTATE)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;  -- automation_logs insert also failed — swallow completely
  END;
END;
$$;

-- ── 3. Rewrite trigger functions — cast first arg as ::text ──────────────────

-- 3a. trg_fn_episode_script_changed
CREATE OR REPLACE FUNCTION public.trg_fn_episode_script_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    NEW.script_base      IS DISTINCT FROM OLD.script_base OR
    NEW.script_generated IS DISTINCT FROM OLD.script_generated
  ) THEN
    PERFORM public.call_automation_ef(
      'automation-script-extraction'::text,
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

-- 3b. trg_fn_asset_approved
CREATE OR REPLACE FUNCTION public.trg_fn_asset_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    PERFORM public.call_automation_ef(
      'automation-asset-publication'::text,
      jsonb_build_object(
        'asset_candidate_id', NEW.id,
        'episode_id',         COALESCE(NEW.episode_id::text, ''),
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

-- 3c. trg_fn_publication_status_changed
CREATE OR REPLACE FUNCTION public.trg_fn_publication_status_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('scheduled', 'published') AND
     (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.call_automation_ef(
      'automation-publication-event'::text,
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

-- 3d. trg_fn_episode_fields_changed
CREATE OR REPLACE FUNCTION public.trg_fn_episode_fields_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.call_automation_ef(
    'automation-episode-evaluate'::text,
    jsonb_build_object(
      'episode_id', NEW.id,
      'source',     'db_trigger'
    )
  );
  RETURN NEW;
END;
$$;

-- 3e. trg_fn_export_package_created
CREATE OR REPLACE FUNCTION public.trg_fn_export_package_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.episode_id IS NOT NULL THEN
    PERFORM public.call_automation_ef(
      'automation-episode-evaluate'::text,
      jsonb_build_object(
        'episode_id', NEW.episode_id::text,
        'source',     'db_trigger'
      )
    );
  END IF;
  RETURN NEW;
END;
$$;
