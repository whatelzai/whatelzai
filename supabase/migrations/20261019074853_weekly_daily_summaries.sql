-- Canonical summaries stay in EMDEE. This table stores only execution metadata.
create table public.daily_weekly_runs (
  owner_id uuid not null references public.users(id),
  week_start date not null check (extract(isodow from week_start) = 1),
  status text not null check (status in ('running', 'completed', 'failed', 'empty')),
  attempts integer not null check (attempts between 1 and 3),
  document_path text,
  source_count integer check (source_count between 0 and 14),
  error_code text check (error_code in ('connection', 'sources', 'generation', 'publication')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  primary key (owner_id, week_start)
);
alter table public.daily_weekly_runs enable row level security;
revoke all on public.daily_weekly_runs from public, anon, authenticated;
grant select, insert, update on public.daily_weekly_runs to service_role;
