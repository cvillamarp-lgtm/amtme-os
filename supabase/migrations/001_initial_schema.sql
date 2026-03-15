-- AMTME OS - Schema inicial
-- Ejecutar en Supabase SQL Editor

-- Habilitar extensión UUID
create extension if not exists "uuid-ossp";

-- AUDIENCE MEMBERS
create table public.audience_members (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id),
  name text not null,
  age_range text,
  gender text,
  occupation text,
  description text,
  emotional_state text,
  quote text,
  pain_points text[],
  desires text[],
  needs text[],
  triggers text[],
  beliefs text[],
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- BRAND ASSETS
create table public.brand_assets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id),
  type text not null,
  label text not null,
  value text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- EPISODE TEMPLATES
create table public.episode_templates (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id),
  title text not null,
  hook text,
  body text,
  closing text,
  cta text,
  structure text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- EPISODES
create table public.episodes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id),
  title text not null,
  number text,
  summary text,
  theme text,
  tags text[],
  hook text,
  cta text,
  quote text,
  status text,
  script_status text,
  recording_status text,
  editing_status text,
  distribution_status text,
  nivel_completitud text,
  release_date date,
  fecha_es_estimada boolean,
  duration text,
  streams_total integer,
  retencion_q1 numeric,
  retencion_q2 numeric,
  retencion_q3 numeric,
  retencion_q4 numeric,
  cover_image_url text,
  link_spotify text,
  descripcion_spotify text,
  titulo_original text,
  estado_validacion text,
  conflicto boolean,
  conflicto_nota text,
  nota_trazabilidad text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- GENERATION HISTORY
create table public.generation_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id),
  type text,
  prompt text,
  result text,
  status text,
  created_at timestamptz default now() not null
);

-- GUESTS
create table public.guests (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id),
  name text not null,
  role text,
  bio text,
  contact text,
  status text,
  topics text[],
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- MENTIONS
create table public.mentions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id),
  name text,
  platform text,
  context text,
  link text,
  date date,
  created_at timestamptz default now() not null
);

-- METRICS
create table public.metrics (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id),
  name text,
  value numeric,
  unit text,
  source text,
  date date,
  created_at timestamptz default now() not null
);

-- RESOURCES
create table public.resources (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id),
  title text,
  description text,
  type text,
  link text,
  status text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- TASKS
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id),
  title text,
  description text,
  priority text,
  category text,
  status text,
  due_date date,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ROW LEVEL SECURITY (RLS) - cada usuario solo ve sus datos
alter table public.audience_members enable row level security;
alter table public.brand_assets enable row level security;
alter table public.episode_templates enable row level security;
alter table public.episodes enable row level security;
alter table public.generation_history enable row level security;
alter table public.guests enable row level security;
alter table public.mentions enable row level security;
alter table public.metrics enable row level security;
alter table public.resources enable row level security;
alter table public.tasks enable row level security;

-- POLITICAS RLS
create policy "Users manage own data" on public.audience_members for all using (auth.uid() = user_id);
create policy "Users manage own data" on public.brand_assets for all using (auth.uid() = user_id);
create policy "Users manage own data" on public.episode_templates for all using (auth.uid() = user_id);
create policy "Users manage own data" on public.episodes for all using (auth.uid() = user_id);
create policy "Users manage own data" on public.generation_history for all using (auth.uid() = user_id);
create policy "Users manage own data" on public.guests for all using (auth.uid() = user_id);
create policy "Users manage own data" on public.mentions for all using (auth.uid() = user_id);
create policy "Users manage own data" on public.metrics for all using (auth.uid() = user_id);
create policy "Users manage own data" on public.resources for all using (auth.uid() = user_id);
create policy "Users manage own data" on public.tasks for all using (auth.uid() = user_id);
