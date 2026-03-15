
CREATE TABLE public.knowledge_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_document text NOT NULL DEFAULT 'AMTME_Documento_Consolidado_2026-03-05',
  source_section text,
  source_subsection text,
  content_type text NOT NULL,
  destination_module text NOT NULL,
  title text NOT NULL,
  content text,
  structured_data jsonb DEFAULT '{}'::jsonb,
  import_status text NOT NULL DEFAULT 'pending',
  source_hash text,
  imported_at timestamptz,
  last_synced_at timestamptz,
  target_record_id uuid,
  target_table text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own knowledge_blocks" ON public.knowledge_blocks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own knowledge_blocks" ON public.knowledge_blocks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own knowledge_blocks" ON public.knowledge_blocks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own knowledge_blocks" ON public.knowledge_blocks FOR DELETE USING (auth.uid() = user_id);

CREATE UNIQUE INDEX idx_knowledge_blocks_source_hash ON public.knowledge_blocks (user_id, source_hash) WHERE source_hash IS NOT NULL;
