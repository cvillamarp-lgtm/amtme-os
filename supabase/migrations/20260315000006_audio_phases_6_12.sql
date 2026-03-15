-- Phase 6: asset_templates + asset_candidates
CREATE TABLE IF NOT EXISTS public.asset_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  asset_type text NOT NULL,
  width integer NOT NULL DEFAULT 1080,
  height integer NOT NULL DEFAULT 1080,
  platform text,
  format text NOT NULL DEFAULT 'png',
  template_data jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.asset_candidates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  episode_id uuid REFERENCES public.episodes(id) ON DELETE SET NULL,
  audio_take_id uuid,
  quote_candidate_id uuid,
  asset_template_id uuid REFERENCES public.asset_templates(id) ON DELETE SET NULL,
  asset_type text NOT NULL,
  platform text,
  title text,
  body_text text,
  score numeric(4,2),
  score_breakdown jsonb,
  status text NOT NULL DEFAULT 'candidate',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.asset_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "asset_templates_user" ON public.asset_templates FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "asset_candidates_user" ON public.asset_candidates FOR ALL USING (auth.uid() = user_id);

-- Phase 7: asset_render_jobs + rendered_assets
CREATE TABLE IF NOT EXISTS public.asset_render_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  asset_candidate_id uuid REFERENCES public.asset_candidates(id) ON DELETE SET NULL,
  job_type text NOT NULL DEFAULT 'render_png',
  status text NOT NULL DEFAULT 'queued',
  visual_prompt text,
  render_params jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rendered_assets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  asset_candidate_id uuid REFERENCES public.asset_candidates(id) ON DELETE SET NULL,
  asset_render_job_id uuid REFERENCES public.asset_render_jobs(id) ON DELETE SET NULL,
  file_path text,
  file_url text,
  file_format text NOT NULL DEFAULT 'png',
  width integer,
  height integer,
  file_size_bytes integer,
  status text NOT NULL DEFAULT 'ready',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.asset_render_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rendered_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "asset_render_jobs_user" ON public.asset_render_jobs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "rendered_assets_user" ON public.rendered_assets FOR ALL USING (auth.uid() = user_id);

-- Phase 8: export_packages + export_package_items + publication_queue
CREATE TABLE IF NOT EXISTS public.export_packages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  episode_id uuid REFERENCES public.episodes(id) ON DELETE SET NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.export_package_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  export_package_id uuid REFERENCES public.export_packages(id) ON DELETE CASCADE NOT NULL,
  rendered_asset_id uuid REFERENCES public.rendered_assets(id) ON DELETE SET NULL,
  asset_type text NOT NULL,
  platform text,
  file_url text,
  file_format text,
  label text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.publication_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  export_package_id uuid REFERENCES public.export_packages(id) ON DELETE SET NULL,
  episode_id uuid REFERENCES public.episodes(id) ON DELETE SET NULL,
  platform text NOT NULL,
  scheduled_at timestamptz,
  published_at timestamptz,
  status text NOT NULL DEFAULT 'scheduled',
  notes text,
  checklist jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.export_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "export_packages_user" ON public.export_packages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "export_package_items_all" ON public.export_package_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.export_packages ep WHERE ep.id = export_package_id AND ep.user_id = auth.uid()));
CREATE POLICY "publication_queue_user" ON public.publication_queue FOR ALL USING (auth.uid() = user_id);

-- Phase 9: metric_snapshots + learning_insights
CREATE TABLE IF NOT EXISTS public.metric_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  episode_id uuid REFERENCES public.episodes(id) ON DELETE SET NULL,
  platform text NOT NULL,
  metric_type text NOT NULL,
  value numeric NOT NULL,
  snapshot_date date NOT NULL,
  raw_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.learning_insights (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  episode_id uuid REFERENCES public.episodes(id) ON DELETE SET NULL,
  insight_type text NOT NULL,
  title text NOT NULL,
  body text,
  data jsonb,
  source text DEFAULT 'manual',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.metric_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "metric_snapshots_user" ON public.metric_snapshots FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "learning_insights_user" ON public.learning_insights FOR ALL USING (auth.uid() = user_id);

-- Phase 12: knowledge_docs
CREATE TABLE IF NOT EXISTS public.knowledge_docs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  body text,
  doc_type text NOT NULL DEFAULT 'sop',
  tags text[],
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "knowledge_docs_user" ON public.knowledge_docs FOR ALL USING (auth.uid() = user_id);
