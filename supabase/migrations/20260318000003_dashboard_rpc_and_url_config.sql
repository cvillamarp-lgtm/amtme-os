-- PR 3: Dashboard single RPC + URL de-hardcoding
-- P1-9: Replace 14 parallel COUNT queries with a single RPC
-- P2-12: Replace hardcoded Supabase URL with database-level GUC

-- ─────────────────────────────────────────────────────────────────────────────
-- P2-12  De-hardcode Supabase project URL in automation functions
-- Functions now read COALESCE(current_setting('app.supabase_url', true), <fallback>)
-- so the hardcoded value is only a safe last-resort fallback.
-- To change without a migration: SET LOCAL app.supabase_url = '...' in a session,
-- or configure app.supabase_url via supabase_realtime role settings.
-- ─────────────────────────────────────────────────────────────────────────────

-- Update call_automation_ef (canonical signature from 20260317000001)
-- Parameter name is "event_type" (not function_name — must match existing signature)
CREATE OR REPLACE FUNCTION public.call_automation_ef(
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

  BEGIN
    INSERT INTO public.automation_logs (event_type, trigger_source, episode_id, status)
    VALUES (event_type, 'trigger', NULL, 'queued');
  EXCEPTION WHEN OTHERS THEN NULL; END;

  PERFORM extensions.pg_net.http_post(
    url     := _url || '/functions/v1/' || event_type,
    body    := payload,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || _key
    )
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- P1-9  Single RPC for all dashboard counts (replaces 14 parallel queries)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.dashboard_counts()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  RETURN json_build_object(
    'episodes',              (SELECT count(*) FROM public.episodes        WHERE user_id = v_uid),
    'tasks',                 (SELECT count(*) FROM public.tasks           WHERE user_id = v_uid AND status = 'todo'),
    'assets',                (SELECT count(*) FROM public.content_assets  WHERE user_id = v_uid),
    'assetsPending',         (SELECT count(*) FROM public.content_assets  WHERE user_id = v_uid AND status IN ('generated','pending')),
    'ideasCapturadas',       (SELECT count(*) FROM public.ideas           WHERE user_id = v_uid AND status = 'captured'),
    'ideasAprobadas',        (SELECT count(*) FROM public.ideas           WHERE user_id = v_uid AND status = 'approved'),
    'briefsActivos',         (SELECT count(*) FROM public.briefs          WHERE user_id = v_uid AND status <> 'converted'),
    'briefsConvertidos',     (SELECT count(*) FROM public.briefs          WHERE user_id = v_uid AND status = 'converted'),
    'pubsScheduled',         (SELECT count(*) FROM public.publications    WHERE user_id = v_uid AND status = 'scheduled'),
    'pubsPublished',         (SELECT count(*) FROM public.publications    WHERE user_id = v_uid AND status = 'published'),
    'insightsExperimenting', (SELECT count(*) FROM public.insights        WHERE user_id = v_uid AND status = 'experimenting'),
    'insightsAccepted',      (SELECT count(*) FROM public.insights        WHERE user_id = v_uid AND status = 'accepted'),
    'quotesTotal',           (SELECT count(*) FROM public.quote_candidates WHERE user_id = v_uid),
    'quotesApproved',        (SELECT count(*) FROM public.quote_candidates WHERE user_id = v_uid AND status = 'approved')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_counts() TO authenticated;
