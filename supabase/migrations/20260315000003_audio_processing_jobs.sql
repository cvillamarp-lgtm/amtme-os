create extension if not exists pgcrypto;

create table if not exists public.audio_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  audio_take_id uuid not null references public.audio_takes(id) on delete cascade,

  job_type text not null default 'mastering',
  preset text not null default 'voice_solo',
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),

  input_file_path text not null,
  output_file_path text null,
  output_file_url text null,

  request_payload jsonb null,
  result_payload jsonb null,

  error_message text null,
  started_at timestamptz null,
  completed_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_audio_processing_jobs_user_id on public.audio_processing_jobs(user_id);
create index if not exists idx_audio_processing_jobs_audio_take_id on public.audio_processing_jobs(audio_take_id);
create index if not exists idx_audio_processing_jobs_status on public.audio_processing_jobs(status);

alter table public.audio_processing_jobs enable row level security;

create policy "audio_processing_jobs_select_own" on public.audio_processing_jobs
  for select to authenticated using (auth.uid() = user_id);

create policy "audio_processing_jobs_insert_own" on public.audio_processing_jobs
  for insert to authenticated with check (auth.uid() = user_id);

create policy "audio_processing_jobs_update_own" on public.audio_processing_jobs
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "audio_processing_jobs_delete_own" on public.audio_processing_jobs
  for delete to authenticated using (auth.uid() = user_id);

create or replace function public.set_audio_processing_jobs_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_audio_processing_jobs_updated_at on public.audio_processing_jobs;
create trigger trg_audio_processing_jobs_updated_at
  before update on public.audio_processing_jobs
  for each row execute function public.set_audio_processing_jobs_updated_at();
