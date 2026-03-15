
-- Create update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Audience Members
CREATE TABLE public.audience_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female', 'non-binary', 'prefer_not_to_say')),
  age_range TEXT CHECK (age_range IN ('18-24', '25-34', '35-44', '45+')),
  occupation TEXT,
  emotional_state TEXT,
  needs TEXT[] DEFAULT '{}',
  beliefs TEXT[] DEFAULT '{}',
  triggers TEXT[] DEFAULT '{}',
  pain_points TEXT[] DEFAULT '{}',
  desires TEXT[] DEFAULT '{}',
  quote TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Brand Assets
CREATE TABLE public.brand_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('logo', 'font', 'color', 'image', 'reference_image')),
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Episodes
CREATE TABLE public.episodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  number TEXT,
  theme TEXT,
  status TEXT DEFAULT 'draft',
  release_date TEXT,
  summary TEXT,
  hook TEXT,
  quote TEXT,
  cta TEXT,
  tags TEXT[] DEFAULT '{}',
  duration TEXT,
  script_status TEXT DEFAULT 'pending',
  recording_status TEXT DEFAULT 'pending',
  editing_status TEXT DEFAULT 'pending',
  distribution_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Episode Templates
CREATE TABLE public.episode_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  structure TEXT,
  hook TEXT,
  body TEXT,
  closing TEXT,
  cta TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Generation History
CREATE TABLE public.generation_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT,
  prompt TEXT,
  result TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Guests
CREATE TABLE public.guests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  bio TEXT,
  topics TEXT[] DEFAULT '{}',
  contact TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mentions
CREATE TABLE public.mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  platform TEXT,
  link TEXT,
  context TEXT,
  date TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Metrics
CREATE TABLE public.metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  value NUMERIC,
  unit TEXT,
  date TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Resources
CREATE TABLE public.resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  type TEXT,
  link TEXT,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  status TEXT DEFAULT 'todo',
  priority TEXT DEFAULT 'medium',
  category TEXT,
  due_date TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.audience_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episode_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['audience_members','brand_assets','episodes','episode_templates','generation_history','guests','mentions','metrics','resources','tasks'])
  LOOP
    EXECUTE format('CREATE POLICY "Users can view own %1$s" ON public.%1$s FOR SELECT USING (auth.uid() = user_id)', tbl);
    EXECUTE format('CREATE POLICY "Users can insert own %1$s" ON public.%1$s FOR INSERT WITH CHECK (auth.uid() = user_id)', tbl);
    EXECUTE format('CREATE POLICY "Users can update own %1$s" ON public.%1$s FOR UPDATE USING (auth.uid() = user_id)', tbl);
    EXECUTE format('CREATE POLICY "Users can delete own %1$s" ON public.%1$s FOR DELETE USING (auth.uid() = user_id)', tbl);
  END LOOP;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_audience_members_updated_at BEFORE UPDATE ON public.audience_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_brand_assets_updated_at BEFORE UPDATE ON public.brand_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_episodes_updated_at BEFORE UPDATE ON public.episodes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_episode_templates_updated_at BEFORE UPDATE ON public.episode_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON public.guests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
