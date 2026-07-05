-- Optional cloud persistence for THRESHOLD v1.3+
-- Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in GitHub Actions secrets / .env.pages

create table if not exists public.scenes (
  code text primary key,
  name text not null default 'Untitled',
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.scenes enable row level security;

create policy "Anyone can read scenes"
  on public.scenes for select
  using (true);

create policy "Anyone can upsert scenes"
  on public.scenes for insert
  with check (true);

create policy "Anyone can update scenes"
  on public.scenes for update
  using (true);

create index if not exists scenes_updated_at_idx on public.scenes (updated_at desc);

-- Project vault (scripts + world snapshot) — v1.8+
create table if not exists public.projects (
  id text primary key,
  name text not null default 'Untitled',
  script_input text not null default '',
  script_output text not null default '',
  running_code text not null default '',
  world jsonb,
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "Anyone can read projects"
  on public.projects for select
  using (true);

create policy "Anyone can upsert projects"
  on public.projects for insert
  with check (true);

create policy "Anyone can update projects"
  on public.projects for update
  using (true);

create index if not exists projects_updated_at_idx on public.projects (updated_at desc);