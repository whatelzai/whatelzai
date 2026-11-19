-- Private operational state. Canonical brief bodies stay in EMDEE.
create table public.daily_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id),
  title text not null check (char_length(title) between 1 and 240),
  lane text not null check (lane in ('day-job','ai-business','network-marketing')),
  due_on date not null,
  status text not null default 'proposed' check (status in ('proposed','open','blocked','waiting','done','deferred','dropped')),
  accepted_on date,
  completed_at timestamptz,
  completed_on date,
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'done') = (completed_at is not null and completed_on is not null))
);
create index daily_tasks_due_idx on public.daily_tasks(owner_id,due_on,created_at) where status not in ('done','dropped','deferred');
create index daily_tasks_completed_idx on public.daily_tasks(owner_id,completed_on);

create table public.daily_documents (
  owner_id uuid not null references public.users(id),
  day date not null,
  kind text not null check (kind in ('morning','evening')),
  document_path text not null,
  section_hash text,
  updated_at timestamptz not null default now(),
  primary key (owner_id,day,kind)
);

-- Attempts are reserved before calling the provider; even failed attempts count.
-- Three attempts per workflow/day maximum; each provider call has a token cap.
create table public.daily_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id),
  day date not null,
  kind text not null check (kind in ('morning','evening')),
  slot integer not null check (slot between 1 and 3),
  status text not null default 'running' check (status in ('running','drafted','failed')),
  model text not null,
  input_tokens integer,
  output_tokens integer,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (owner_id,day,kind,slot)
);
alter table public.daily_tasks enable row level security;
alter table public.daily_documents enable row level security;
alter table public.daily_runs enable row level security;
revoke all on public.daily_tasks,public.daily_documents,public.daily_runs from public,anon,authenticated;
grant select,insert,update on public.daily_tasks,public.daily_documents,public.daily_runs to service_role;

-- Credentials are encrypted with an independent deployment key, never returned
-- to the browser after submission. Operational configuration only, no brief bodies.
create table public.daily_connections (
  owner_id uuid not null references public.users(id),
  provider text not null check (provider in ('emdee','openai','emdee-pkce')),
  encrypted_credentials text not null,
  updated_at timestamptz not null default now(),
  primary key (owner_id,provider)
);
alter table public.daily_connections enable row level security;
revoke all on public.daily_connections from public,anon,authenticated;
grant select,insert,update,delete on public.daily_connections to service_role;
