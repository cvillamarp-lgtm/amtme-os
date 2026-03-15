create extension if not exists pgcrypto;

create table if not exists public.audio_takes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  episode_id uuid null references public.episodes(id) on delete set null,

  title text not null,

  original_file_path text not null,
  original_file_url text null,
  original_mime_type text not null,

  duration_seconds numeric(10,2) null,
  peak_db numeric(10,2) null,
  rms_db numeric(10,2) null,
  clipping_count integer not null default 0,
  sample_rate integer null,
  channels integer null,

  master_file_path text null,
  master_file_url text null,
  master_mime_type text null,
  master_duration_seconds numeric(10,2) null,
  master_peak_db numeric(10,2) null,
  master_rms_db numeric(10,2) null,
  master_clipping_count integer null,

  mastering_status text not null default 'none' check (mastering_status in ('none','ready','failed')),
  mastering_profile text null,
  mastering_last_error text null,

  status text not null default 'recorded',
  processing_notes text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_audio_takes_user_id on public.audio_takes(user_id);
create index if not exists idx_audio_takes_episode_id on public.audio_takes(episode_id);
create index if not exists idx_audio_takes_created_at on public.audio_takes(created_at desc);

alter table public.audio_takes enable row level security;

drop policy if exists "audio_takes_select_own" on public.audio_takes;
drop policy if exists "audio_takes_insert_own" on public.audio_takes;
drop policy if exists "audio_takes_update_own" on public.audio_takes;
drop policy if exists "audio_takes_delete_own" on public.audio_takes;

create policy "audio_takes_select_own" on public.audio_takes
  for select to authenticated using (auth.uid() = user_id);

create policy "audio_takes_insert_own" on public.audio_takes
  for insert to authenticated with check (auth.uid() = user_id);

create policy "audio_takes_update_own" on public.audio_takes
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "audio_takes_delete_own" on public.audio_takes
  for delete to authenticated using (auth.uid() = user_id);

create or replace function public.set_audio_takes_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_audio_takes_updated_at on public.audio_takes;
create trigger trg_audio_takes_updated_at
  before update on public.audio_takes
  for each row execute function public.set_audio_takes_updated_at();

insert into storage.buckets (id, name, public) values ('audio-takes', 'audio-takes', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('audio-masters', 'audio-masters', true) on conflict (id) do nothing;

drop policy if exists "audio_takes_storage_select_own" on storage.objects;
drop policy if exists "audio_takes_storage_insert_own" on storage.objects;
drop policy if exists "audio_takes_storage_update_own" on storage.objects;
drop policy if exists "audio_takes_storage_delete_own" on storage.objects;

create policy "audio_takes_storage_select_own" on storage.objects
  for select to authenticated using (bucket_id in ('audio-takes', 'audio-masters'));

create policy "audio_takes_storage_insert_own" on storage.objects
  for insert to authenticated with check (
    bucket_id in ('audio-takes', 'audio-masters')
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "audio_takes_storage_update_own" on storage.objects
  for update to authenticated using (
    bucket_id in ('audio-takes', 'audio-masters')
    and auth.uid()::text = (storage.foldername(name))[1]
  ) with check (
    bucket_id in ('audio-takes', 'audio-masters')
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "audio_takes_storage_delete_own" on storage.objects
  for delete to authenticated using (
    bucket_id in ('audio-takes', 'audio-masters')
    and auth.uid()::text = (storage.foldername(name))[1]
  );
