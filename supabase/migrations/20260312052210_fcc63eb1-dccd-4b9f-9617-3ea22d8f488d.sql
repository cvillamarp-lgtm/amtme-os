
-- ============================================
-- PHASE 1: Consolidate episodes as single source of truth
-- ============================================

-- Add missing fields to episodes
ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS working_title text,
  ADD COLUMN IF NOT EXISTS final_title text,
  ADD COLUMN IF NOT EXISTS core_thesis text,
  ADD COLUMN IF NOT EXISTS script_base text,
  ADD COLUMN IF NOT EXISTS script_generated text,
  ADD COLUMN IF NOT EXISTS derived_copies_json jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS prompt_set_json jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS checklist_qa_json jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS checklist_assets_json jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS publication_blockers_json jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS health_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS template_id uuid,
  ADD COLUMN IF NOT EXISTS visual_preset_id uuid,
  ADD COLUMN IF NOT EXISTS ready_for_production boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ready_for_publish boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS estado_produccion text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS estado_publicacion text DEFAULT 'not_started';

-- Normalize: rename conflicto -> conflicto_detectado (keep old for compat, add alias)
-- We'll keep 'conflicto' column as-is to avoid breaking existing code, but add the new name
ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS conflicto_detectado boolean DEFAULT false;

-- Sync existing data
UPDATE public.episodes SET conflicto_detectado = conflicto WHERE conflicto IS NOT NULL AND conflicto_detectado = false;
UPDATE public.episodes SET working_title = title WHERE working_title IS NULL;

-- ============================================
-- PHASE 2: Add episode_id to tasks, metrics, resources
-- ============================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS episode_id uuid REFERENCES public.episodes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS task_type text DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS blocking boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

ALTER TABLE public.metrics
  ADD COLUMN IF NOT EXISTS episode_id uuid REFERENCES public.episodes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metric_group text,
  ADD COLUMN IF NOT EXISTS source_file_name text,
  ADD COLUMN IF NOT EXISTS source_import_batch text,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS episode_id uuid REFERENCES public.episodes(id) ON DELETE SET NULL;

-- ============================================
-- PHASE 3: Enhance content_assets
-- ============================================

ALTER TABLE public.content_assets
  ADD COLUMN IF NOT EXISTS variant_name text,
  ADD COLUMN IF NOT EXISTS template_id uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- ============================================
-- PHASE 4: Add template_id FK on episodes
-- ============================================

ALTER TABLE public.episodes
  ADD CONSTRAINT fk_episodes_template
  FOREIGN KEY (template_id) REFERENCES public.episode_templates(id) ON DELETE SET NULL;

-- ============================================
-- PHASE 5: Indexes for new columns
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tasks_episode_id ON public.tasks(episode_id);
CREATE INDEX IF NOT EXISTS idx_metrics_episode_id ON public.metrics(episode_id);
CREATE INDEX IF NOT EXISTS idx_resources_episode_id ON public.resources(episode_id);
CREATE INDEX IF NOT EXISTS idx_episodes_estado_produccion ON public.episodes(estado_produccion);
CREATE INDEX IF NOT EXISTS idx_episodes_health_score ON public.episodes(health_score);
