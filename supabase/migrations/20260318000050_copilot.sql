-- Copiloto Operativo: audit log + episode extra columns

CREATE TABLE IF NOT EXISTS public.audit_events (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  episode_id uuid        REFERENCES public.episodes(id) ON DELETE SET NULL,
  user_id    uuid        NOT NULL,
  action     text        NOT NULL,
  patch      jsonb,
  result     jsonb,
  error      text
);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own audit events"
  ON public.audit_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- service_role inserts (edge function runs as service_role)
CREATE POLICY "Service role can insert audit events"
  ON public.audit_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Episode: copilot working columns
ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS copilot_candidates jsonb  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS script_clean       text;
