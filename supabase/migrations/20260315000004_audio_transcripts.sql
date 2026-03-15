create extension if not exists pgcrypto;

create table if not exists public.audio_transcripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  audio_take_id uuid not null references public.audio_takes(id) on delete cascade,

  status text not null default 'queued' check (status in ('queued','processing','completed','failed')),
  language text not null default 'es',
  provider text null,
  source text not null default 'server',
  full_text text null,
  confidence numeric(5,2) null,
  error_message text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(audio_take_id)
);

create table if not exists public.audio_transcript_segments (
  id uuid primary key default gen_random_uuid(),
  transcript_id uuid not null references public.audio_transcripts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  audio_take_id uuid not null references public.audio_takes(id) on delete cascade,

  segment_index integer not null,
  start_seconds numeric(10,3) not null,
  end_seconds numeric(10,3) not null,
  text text not null,
  confidence numeric(5,2) null,

  is_hook boolean not null default false,
  is_quote boolean not null default false,
  is_clip_candidate boolean not null default false,
  emotional_score numeric(5,2) null,
  clarity_score numeric(5,2) null,
  reuse_score numeric(5,2) null,

  created_at timestamptz not null default now()
);

create index if not exists idx_audio_transcripts_user_id on public.audio_transcripts(user_id);
create index if not exists idx_audio_transcripts_audio_take_id on public.audio_transcripts(audio_take_id);
create index if not exists idx_audio_transcript_segments_transcript_id on public.audio_transcript_segments(transcript_id);
create index if not exists idx_audio_transcript_segments_audio_take_id on public.audio_transcript_segments(audio_take_id);
create index if not exists idx_audio_transcript_segments_user_id on public.audio_transcript_segments(user_id);

alter table public.audio_transcripts enable row level security;
alter table public.audio_transcript_segments enable row level security;

create policy "audio_transcripts_select_own" on public.audio_transcripts for select to authenticated using (auth.uid() = user_id);
create policy "audio_transcripts_insert_own" on public.audio_transcripts for insert to authenticated with check (auth.uid() = user_id);
create policy "audio_transcripts_update_own" on public.audio_transcripts for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "audio_transcripts_delete_own" on public.audio_transcripts for delete to authenticated using (auth.uid() = user_id);

create policy "audio_transcript_segments_select_own" on public.audio_transcript_segments for select to authenticated using (auth.uid() = user_id);
create policy "audio_transcript_segments_insert_own" on public.audio_transcript_segments for insert to authenticated with check (auth.uid() = user_id);
create policy "audio_transcript_segments_update_own" on public.audio_transcript_segments for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "audio_transcript_segments_delete_own" on public.audio_transcript_segments for delete to authenticated using (auth.uid() = user_id);

create or replace function public.set_audio_transcripts_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_audio_transcripts_updated_at on public.audio_transcripts;
create trigger trg_audio_transcripts_updated_at
  before update on public.audio_transcripts
  for each row execute function public.set_audio_transcripts_updated_at();
