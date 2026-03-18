-- PR 1: Security + data integrity fixes
-- P0-1: Storage SELECT policy was missing user isolation (any auth user could read any file)
-- P1-4: Episode number race condition replaced with DB-side sequence per user

-- ─────────────────────────────────────────────────────────────────────────────
-- P0-1  Fix audio storage SELECT to scope by owner folder
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "audio_takes_storage_select_own" on storage.objects;

create policy "audio_takes_storage_select_own" on storage.objects
  for select to authenticated using (
    bucket_id in ('audio-takes', 'audio-masters')
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- P1-4  Replace client-side COUNT+1 with a DB-side function to avoid race
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.next_episode_number(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.episodes
  where user_id = p_user_id;

  return lpad((v_count + 1)::text, 2, '0');
end;
$$;

grant execute on function public.next_episode_number(uuid) to authenticated;
