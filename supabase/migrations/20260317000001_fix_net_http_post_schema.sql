-- ============================================================
-- Migration: Fix pg_net schema reference in call_automation_ef
-- Created: 2026-03-17
-- Cause: Previous migrations (20260316000006, 20260316000008) called
--   extensions.pg_net.http_post(...) which is incorrect. The pg_net
--   extension registers its functions in the `net` schema, so the
--   correct call is net.http_post(...).
-- Fix: Recreate call_automation_ef with the corrected schema reference.
-- ============================================================

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
