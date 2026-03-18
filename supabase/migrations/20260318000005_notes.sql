-- Notes feature: private notes per user (Apple Notes-like)

CREATE TABLE IF NOT EXISTS public.notes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text        NOT NULL DEFAULT '',
  body        text        NOT NULL DEFAULT '',
  pinned      boolean     NOT NULL DEFAULT false,
  tags        text[]      NOT NULL DEFAULT '{}',
  archived_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notes" ON public.notes
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Reuse the existing updated_at trigger function
CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_notes_user_updated
  ON public.notes(user_id, updated_at DESC)
  WHERE archived_at IS NULL;
