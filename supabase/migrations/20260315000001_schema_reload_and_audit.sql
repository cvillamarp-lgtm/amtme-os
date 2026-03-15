-- ============================================================
-- Schema cache reload + audit trail + persistence columns
-- ============================================================

-- 1. Re-ensure all episode columns exist (IF NOT EXISTS = safe/idempotent)
ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS estado_produccion          text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS estado_publicacion         text DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS idea_principal             text,
  ADD COLUMN IF NOT EXISTS conflicto_central          text,
  ADD COLUMN IF NOT EXISTS intencion_del_episodio     text,
  ADD COLUMN IF NOT EXISTS tono                       text DEFAULT 'íntimo',
  ADD COLUMN IF NOT EXISTS restricciones              text,
  ADD COLUMN IF NOT EXISTS working_title              text,
  ADD COLUMN IF NOT EXISTS final_title                text,
  ADD COLUMN IF NOT EXISTS core_thesis                text,
  ADD COLUMN IF NOT EXISTS script_base                text,
  ADD COLUMN IF NOT EXISTS script_generated           text,
  ADD COLUMN IF NOT EXISTS generation_metadata        jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS selected_conflicto_tipo    text,
  ADD COLUMN IF NOT EXISTS selected_intencion_tipo    text;

-- 2. Audit trail table — records every meaningful change to any record
CREATE TABLE IF NOT EXISTS public.change_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  table_name      text NOT NULL,
  record_id       uuid NOT NULL,
  field_name      text NOT NULL,
  old_value       text,
  new_value       text,
  change_origin   text NOT NULL DEFAULT 'manual', -- 'manual' | 'ai' | 'system' | 'import'
  changed_at      timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_change_history_record  ON public.change_history(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_change_history_user    ON public.change_history(user_id);
CREATE INDEX IF NOT EXISTS idx_change_history_time    ON public.change_history(changed_at DESC);

ALTER TABLE public.change_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own changes"
  ON public.change_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own changes"
  ON public.change_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Episode creation wizard state — persists 2-step wizard progress
CREATE TABLE IF NOT EXISTS public.episode_drafts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  idea_principal  text,
  tono            text,
  restricciones   text,
  release_date    date,
  conflict_options_json  jsonb DEFAULT '{}'::jsonb, -- generated options from AI
  selected_conflicto     jsonb,                     -- chosen option
  selected_intencion     jsonb,                     -- chosen option
  step            integer DEFAULT 1,
  converted_to_episode_id uuid REFERENCES public.episodes(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now() NOT NULL,
  updated_at      timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_episode_drafts_user   ON public.episode_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_episode_drafts_active ON public.episode_drafts(user_id) WHERE converted_to_episode_id IS NULL;

ALTER TABLE public.episode_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own drafts"
  ON public.episode_drafts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
