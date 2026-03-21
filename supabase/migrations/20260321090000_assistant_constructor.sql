-- Assistant Constructor: plan/preview/apply/rollback traceability

create table if not exists public.assistant_action_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  instruction text not null,
  intent text not null default 'UPDATE_FIELDS',
  status text not null default 'planned' check (status in ('planned', 'applied', 'canceled', 'rolled_back', 'error')),
  plan_summary text,
  proposed_changes jsonb not null default '[]'::jsonb,
  conflicts jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  before_snapshot jsonb not null default '{}'::jsonb,
  after_snapshot jsonb,
  executed_actions jsonb,
  applied_at timestamptz,
  rolled_back_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_assistant_action_runs_episode_created
  on public.assistant_action_runs (episode_id, created_at desc);

create index if not exists idx_assistant_action_runs_user_created
  on public.assistant_action_runs (user_id, created_at desc);

alter table public.assistant_action_runs enable row level security;

create policy if not exists "Users can view own assistant runs"
  on public.assistant_action_runs
  for select
  using (auth.uid() = user_id);

create policy if not exists "Users can insert own assistant runs"
  on public.assistant_action_runs
  for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can update own assistant runs"
  on public.assistant_action_runs
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.touch_assistant_action_runs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_assistant_action_runs_updated_at on public.assistant_action_runs;
create trigger trg_touch_assistant_action_runs_updated_at
before update on public.assistant_action_runs
for each row execute function public.touch_assistant_action_runs_updated_at();
