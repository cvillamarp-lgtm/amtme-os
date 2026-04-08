-- Fix dashboard_counts RPC: correct status filters and add missing insightsActive count
-- Changes:
--   ideasCapturadas  → all non-archived ideas (real pipeline funnel entry, not just 'captured')
--   briefsActivos    → only draft + approved briefs (excludes rejected)
--   insightsActive   → new field for insights in 'active' state (default after creation)
--   quotesTotal      → excludes discarded + converted (only active-lifecycle quotes)

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
    -- Episodes: total
    'episodes',              (SELECT count(*) FROM public.episodes         WHERE user_id = v_uid),

    -- Tasks: pending
    'tasks',                 (SELECT count(*) FROM public.tasks            WHERE user_id = v_uid AND status = 'todo'),

    -- Assets
    'assets',                (SELECT count(*) FROM public.content_assets   WHERE user_id = v_uid),
    'assetsPending',         (SELECT count(*) FROM public.content_assets   WHERE user_id = v_uid AND status IN ('generated','pending')),

    -- Ideas: all active (not archived) for pipeline funnel; approved subset for KPI card
    'ideasCapturadas',       (SELECT count(*) FROM public.ideas            WHERE user_id = v_uid AND status NOT IN ('archived')),
    'ideasAprobadas',        (SELECT count(*) FROM public.ideas            WHERE user_id = v_uid AND status = 'approved'),

    -- Briefs: only draft + approved = truly "in progress"; converted counted separately
    'briefsActivos',         (SELECT count(*) FROM public.briefs           WHERE user_id = v_uid AND status IN ('draft','approved')),
    'briefsConvertidos',     (SELECT count(*) FROM public.briefs           WHERE user_id = v_uid AND status = 'converted'),

    -- Publications
    'pubsScheduled',         (SELECT count(*) FROM public.publications     WHERE user_id = v_uid AND status = 'scheduled'),
    'pubsPublished',         (SELECT count(*) FROM public.publications     WHERE user_id = v_uid AND status = 'published'),

    -- Insights: three states (active = default/new, experimenting, accepted)
    'insightsActive',        (SELECT count(*) FROM public.insights         WHERE user_id = v_uid AND status = 'active'),
    'insightsExperimenting', (SELECT count(*) FROM public.insights         WHERE user_id = v_uid AND status = 'experimenting'),
    'insightsAccepted',      (SELECT count(*) FROM public.insights         WHERE user_id = v_uid AND status = 'accepted'),

    -- Quotes: exclude discarded + converted (active lifecycle only)
    'quotesTotal',           (SELECT count(*) FROM public.quote_candidates WHERE user_id = v_uid AND status NOT IN ('discarded','converted')),
    'quotesApproved',        (SELECT count(*) FROM public.quote_candidates WHERE user_id = v_uid AND status = 'approved')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_counts() TO authenticated;
