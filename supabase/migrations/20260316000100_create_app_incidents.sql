create table if not exists public.app_incidents (
  id uuid primary key default gen_random_uuid(),
  incident_id text not null,
  kind text not null,
  severity text not null,
  status text not null,
  title text not null,
  message text not null,
  error_name text null,
  stack text null,
  route_pathname text not null,
  route_search text null,
  build_id text null,
  user_id uuid null,
  entity_type text null,
  entity_id text null,
  entity_title text null,
  query_keys jsonb not null default '[]'::jsonb,
  automation_logs jsonb not null default '[]'::jsonb,
  extra_context jsonb not null default '{}'::jsonb,
  executed_actions jsonb not null default '[]'::jsonb,
  fingerprint text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_app_incidents_created_at on public.app_incidents(created_at desc);
create index if not exists idx_app_incidents_user_id on public.app_incidents(user_id);
create index if not exists idx_app_incidents_fingerprint on public.app_incidents(fingerprint);

alter table public.app_incidents enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'app_incidents'
      and policyname = 'Users can insert own incidents'
  ) then
    create policy "Users can insert own incidents"
      on public.app_incidents for insert to authenticated
      with check (auth.uid() = user_id or user_id is null);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'app_incidents'
      and policyname = 'Users can view own incidents'
  ) then
    create policy "Users can view own incidents"
      on public.app_incidents for select to authenticated
      using (auth.uid() = user_id or user_id is null);
  end if;
end $$;
