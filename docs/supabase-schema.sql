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