create extension if not exists pgcrypto;

create table if not exists public.audio_segment_selections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  audio_take_id uuid not null references public.audio_takes(id) on delete cascade,
  transcript_segment_id uuid not null references public.audio_transcript_segments(id) on delete cascade,

  action_type text not null check (action_type in ('keep','remove','clip','quote')),
  label text null,
  notes text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(audio_take_id, transcript_segment_id, action_type)
);

-- quote_candidates already exists from a previous migration; add new columns if missing
alter table public.quote_candidates
  add column if not exists audio_take_id uuid null references public.audio_takes(id) on delete set null;

alter table public.quote_candidates
  add column if not exists transcript_segment_id uuid null references public.audio_transcript_segments(id) on delete set null;

alter table public.quote_candidates
  add column if not exists source_type text not null default 'audio_transcript';

alter table public.quote_candidates
  add column if not exists start_seconds numeric(10,3) null;

alter table public.quote_candidates
  add column if not exists end_seconds numeric(10,3) null;

alter table public.quote_candidates
  add column if not exists emotional_score numeric(5,2) null;

alter table public.quote_candidates
  add column if not exists clarity_score numeric(5,2) null;

alter table public.quote_candidates
  add column if not exists reuse_score numeric(5,2) null;

alter table public.quote_candidates
  add column if not exists notes text null;

-- Make episode_id nullable if not already (previous schema had it NOT NULL)
alter table public.quote_candidates
  alter column episode_id drop not null;

create index if not exists idx_audio_segment_selections_user_id on public.audio_segment_selections(user_id);
create index if not exists idx_audio_segment_selections_audio_take_id on public.audio_segment_selections(audio_take_id);
create index if not exists idx_quote_candidates_user_id on public.quote_candidates(user_id);
create index if not exists idx_quote_candidates_audio_take_id on public.quote_candidates(audio_take_id);

alter table public.audio_segment_selections enable row level security;

create policy "audio_segment_selections_select_own" on public.audio_segment_selections for select to authenticated using (auth.uid() = user_id);
create policy "audio_segment_selections_insert_own" on public.audio_segment_selections for insert to authenticated with check (auth.uid() = user_id);
create policy "audio_segment_selections_update_own" on public.audio_segment_selections for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "audio_segment_selections_delete_own" on public.audio_segment_selections for delete to authenticated using (auth.uid() = user_id);

create or replace function public.set_audio_segment_selections_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_audio_segment_selections_updated_at on public.audio_segment_selections;
create trigger trg_audio_segment_selections_updated_at
  before update on public.audio_segment_selections
  for each row execute function public.set_audio_segment_selections_updated_at();

create or replace function public.set_quote_candidates_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_quote_candidates_updated_at on public.quote_candidates;
create trigger trg_quote_candidates_updated_at
  before update on public.quote_candidates
  for each row execute function public.set_quote_candidates_updated_at();
