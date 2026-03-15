-- ─────────────────────────────────────────────────────────────────
-- AMTME OS — Ideas Bank + Supporting Tables
-- Adds: ideas, briefs, narrative_skeletons, quote_candidates,
--       platform_accounts, publications, insights, audit_log
-- ─────────────────────────────────────────────────────────────────

-- ── 0. ENSURE HELPER FUNCTION EXISTS ─────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ── 1. IDEAS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ideas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title           text NOT NULL,
  description     text,
  origin          text CHECK (origin IN ('personal','research','trending','audience','experience','other')),
  tags            text[] DEFAULT '{}',
  theme           text,
  emotional_theme text,
  audience_fit    text,
  format_suggested text DEFAULT 'solo',
  content_potential_score    integer DEFAULT 3 CHECK (content_potential_score BETWEEN 1 AND 5),
  derivative_potential_score integer DEFAULT 3 CHECK (derivative_potential_score BETWEEN 1 AND 5),
  urgency_level   text DEFAULT 'medium' CHECK (urgency_level IN ('low','medium','high','urgent')),
  status          text DEFAULT 'captured' CHECK (status IN ('captured','evaluating','approved','in_brief','backlog','archived')),
  notes           text,
  reference_links text,
  created_at      timestamptz DEFAULT now() NOT NULL,
  updated_at      timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ideas" ON public.ideas FOR ALL USING (auth.uid() = user_id);
CREATE TRIGGER ideas_updated_at BEFORE UPDATE ON public.ideas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_ideas_user_status ON public.ideas(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ideas_user_created ON public.ideas(user_id, created_at DESC);

-- ── 2. BRIEFS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.briefs (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  idea_id                   uuid REFERENCES public.ideas(id) ON DELETE SET NULL,
  episode_id                uuid REFERENCES public.episodes(id) ON DELETE SET NULL,
  title                     text NOT NULL,
  thesis                    text,
  audience                  text,
  pain_point                text,
  promise                   text,
  angle                     text,
  emotional_transformation  text,
  cta                       text,
  tone                      text,
  risks                     text,
  keywords                  text[] DEFAULT '{}',
  status                    text DEFAULT 'draft' CHECK (status IN ('draft','approved','rejected','converted')),
  notes                     text,
  created_at                timestamptz DEFAULT now() NOT NULL,
  updated_at                timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own briefs" ON public.briefs FOR ALL USING (auth.uid() = user_id);
CREATE TRIGGER briefs_updated_at BEFORE UPDATE ON public.briefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_briefs_user ON public.briefs(user_id);
CREATE INDEX IF NOT EXISTS idx_briefs_idea ON public.briefs(idea_id);

-- ── 3. NARRATIVE SKELETONS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.narrative_skeletons (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name              text NOT NULL,
  objective         text,
  blocks            jsonb DEFAULT '[]',
  episode_type      text DEFAULT 'solo',
  suggested_duration text,
  is_default        boolean DEFAULT false,
  created_at        timestamptz DEFAULT now() NOT NULL,
  updated_at        timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.narrative_skeletons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own skeletons" ON public.narrative_skeletons FOR ALL USING (auth.uid() = user_id);
CREATE TRIGGER narrative_skeletons_updated_at BEFORE UPDATE ON public.narrative_skeletons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 4. QUOTE CANDIDATES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quote_candidates (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  episode_id         uuid REFERENCES public.episodes(id) ON DELETE CASCADE NOT NULL,
  text               text NOT NULL,
  timestamp_ref      text,
  quote_type         text CHECK (quote_type IN ('hook','truth','confrontation','revelation','identification','cta_emotional','closing')),
  emotional_intensity integer DEFAULT 3 CHECK (emotional_intensity BETWEEN 1 AND 5),
  clarity            integer DEFAULT 3 CHECK (clarity BETWEEN 1 AND 5),
  memorability       integer DEFAULT 3 CHECK (memorability BETWEEN 1 AND 5),
  shareability       integer DEFAULT 3 CHECK (shareability BETWEEN 1 AND 5),
  saveability        integer DEFAULT 3 CHECK (saveability BETWEEN 1 AND 5),
  visual_fit         integer DEFAULT 3 CHECK (visual_fit BETWEEN 1 AND 5),
  score_total        integer GENERATED ALWAYS AS (
    emotional_intensity + clarity + memorability + shareability + saveability + visual_fit
  ) STORED,
  status             text DEFAULT 'extracted' CHECK (status IN ('extracted','classified','candidate','approved','converted','discarded','reused')),
  assigned_format    text CHECK (assigned_format IN ('quote_static','carousel','reel_cover','story','teaser')),
  asset_id           uuid,  -- FK to content_assets added later when table exists
  approval_required  boolean DEFAULT true,
  created_at         timestamptz DEFAULT now() NOT NULL,
  updated_at         timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.quote_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own quotes" ON public.quote_candidates FOR ALL USING (auth.uid() = user_id);
CREATE TRIGGER quote_candidates_updated_at BEFORE UPDATE ON public.quote_candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_quote_candidates_episode ON public.quote_candidates(episode_id);
CREATE INDEX IF NOT EXISTS idx_quote_candidates_status ON public.quote_candidates(user_id, status);

-- ── 5. PLATFORM ACCOUNTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_accounts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform     text NOT NULL CHECK (platform IN ('instagram','tiktok','youtube','spotify','x')),
  account_name text NOT NULL,
  account_id   text,
  is_active    boolean DEFAULT true,
  metadata     jsonb DEFAULT '{}',
  created_at   timestamptz DEFAULT now() NOT NULL,
  updated_at   timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, platform)
);

ALTER TABLE public.platform_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own platform accounts" ON public.platform_accounts FOR ALL USING (auth.uid() = user_id);
CREATE TRIGGER platform_accounts_updated_at BEFORE UPDATE ON public.platform_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 6. PUBLICATIONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.publications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  episode_id      uuid REFERENCES public.episodes(id) ON DELETE CASCADE NOT NULL,
  asset_id        uuid,  -- FK to content_assets added later when table exists
  platform        text NOT NULL CHECK (platform IN ('instagram_feed','instagram_reel','instagram_story','tiktok','youtube','spotify','x')),
  copy_final      text,
  cta_text        text,
  cta_type        text,
  hashtags        text[] DEFAULT '{}',
  scheduled_at    timestamptz,
  published_at    timestamptz,
  status          text DEFAULT 'draft' CHECK (status IN ('draft','approved','scheduled','published','failed')),
  link_published  text,
  objective       text,
  checklist_json  jsonb DEFAULT '{}',
  error_log       text,
  created_at      timestamptz DEFAULT now() NOT NULL,
  updated_at      timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own publications" ON public.publications FOR ALL USING (auth.uid() = user_id);
CREATE TRIGGER publications_updated_at BEFORE UPDATE ON public.publications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_publications_episode ON public.publications(episode_id);
CREATE INDEX IF NOT EXISTS idx_publications_status ON public.publications(user_id, status);

-- ── 7. INSIGHTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.insights (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  episode_id       uuid REFERENCES public.episodes(id) ON DELETE SET NULL,
  finding          text NOT NULL,
  hypothesis       text,
  recommendation   text,
  confidence_level text DEFAULT 'medium' CHECK (confidence_level IN ('low','medium','high','confirmed')),
  evidence         text,
  status           text DEFAULT 'active' CHECK (status IN ('active','accepted','discarded','experimenting')),
  source           text DEFAULT 'manual' CHECK (source IN ('manual','auto_detected')),
  created_at       timestamptz DEFAULT now() NOT NULL,
  updated_at       timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own insights" ON public.insights FOR ALL USING (auth.uid() = user_id);
CREATE TRIGGER insights_updated_at BEFORE UPDATE ON public.insights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_insights_user ON public.insights(user_id);

-- ── 8. AUDIT LOG ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  entity_type text NOT NULL,
  entity_id   uuid,
  action      text NOT NULL CHECK (action IN ('created','updated','deleted','approved','status_changed','converted')),
  old_value   jsonb,
  new_value   jsonb,
  metadata    jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own audit log" ON public.audit_log FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(user_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(user_id, created_at DESC);
