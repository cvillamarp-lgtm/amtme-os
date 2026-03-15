-- A: Private documents table for master-document.md
CREATE TABLE IF NOT EXISTS public.private_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.private_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own private_documents" ON public.private_documents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own private_documents" ON public.private_documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own private_documents" ON public.private_documents FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own private_documents" ON public.private_documents FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- I: Add missing FK on content_assets.episode_id (check if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'content_assets_episode_id_fkey'
      AND table_name = 'content_assets'
  ) THEN
    ALTER TABLE public.content_assets
      ADD CONSTRAINT content_assets_episode_id_fkey
      FOREIGN KEY (episode_id) REFERENCES public.episodes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- I: Add missing FK on tasks.episode_id (check if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tasks_episode_id_fkey'
      AND table_name = 'tasks'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_episode_id_fkey
      FOREIGN KEY (episode_id) REFERENCES public.episodes(id) ON DELETE SET NULL;
  END IF;
END $$;