-- Fix: call_automation_ef was broken by 20260318000003 which:
--   1. Used extensions.pg_net.http_post (wrong schema — should be net.http_post)
--   2. Had no EXCEPTION handler — HTTP failures propagated and broke episode saves
--
-- This restores the safe canonical version from 20260317000001 +
-- keeps the GUC url de-hardcoding from 20260318000003.

-- Drop all overloads before recreating (avoids signature conflicts)
DO $$
DECLARE r RECORD;
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

-- Canonical: net.http_post + full EXCEPTION block that never raises
CREATE FUNCTION public.call_automation_ef(
  event_type text,
  payload    jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _url text := COALESCE(
    NULLIF(current_setting('app.supabase_url', true), ''),
    'https://vudvgfdoeciurejtbzbw.supabase.co'
  );
  _key text;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO _key
    FROM   vault.decrypted_secrets
    WHERE  name = 'automation_service_role_key'
    LIMIT  1;
  EXCEPTION WHEN OTHERS THEN
    _key := NULL;
  END;

  IF _key IS NULL OR _key = '' THEN
    _key := current_setting('app.service_role_key', true);
  END IF;

  IF _key IS NULL OR _key = '' THEN
    RETURN;
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
    NULL;
  END;
END;
$$;

-- Restore trigger functions with explicit ::text cast on first arg
-- (prevents PostgreSQL overload resolution ambiguity)

CREATE OR REPLACE FUNCTION public.trg_fn_episode_script_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.script_base IS DISTINCT FROM OLD.script_base OR
     NEW.script_generated IS DISTINCT FROM OLD.script_generated THEN
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
END; $$;

CREATE OR REPLACE FUNCTION public.trg_fn_asset_approved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
END; $$;

CREATE OR REPLACE FUNCTION public.trg_fn_publication_status_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('scheduled', 'published') AND
     OLD.status IS DISTINCT FROM NEW.status THEN
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
END; $$;

CREATE OR REPLACE FUNCTION public.trg_fn_episode_fields_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.call_automation_ef(
    'automation-episode-evaluate'::text,
    jsonb_build_object('episode_id', NEW.id, 'source', 'db_trigger')
  );
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_fn_export_package_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.episode_id IS NOT NULL THEN
    PERFORM public.call_automation_ef(
      'automation-episode-evaluate'::text,
      jsonb_build_object('episode_id', NEW.episode_id::text, 'source', 'db_trigger')
    );
  END IF;
  RETURN NEW;
END; $$;
