
-- Create content_assets table
CREATE TABLE public.content_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  episode_id uuid REFERENCES public.episodes(id) ON DELETE SET NULL,
  piece_id integer NOT NULL,
  piece_name text NOT NULL,
  image_url text,
  caption text,
  hashtags text,
  prompt_used text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_assets ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own content_assets" ON public.content_assets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own content_assets" ON public.content_assets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own content_assets" ON public.content_assets
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own content_assets" ON public.content_assets
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_content_assets_updated_at
  BEFORE UPDATE ON public.content_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
