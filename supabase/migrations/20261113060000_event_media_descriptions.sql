-- Private, owner-managed descriptions for existing event media objects.
create table public.event_media_assets (
  event_key text not null,
  storage_path text not null,
  title text not null default '' check (length(title) <= 120),
  description text not null default '' check (length(description) <= 2000),
  people text[] not null default '{}' check (cardinality(people) <= 12),
  revision integer not null default 1 check (revision > 0),
  updated_by uuid not null references public.users(id),
  updated_at timestamptz not null default now(),
  primary key (event_key, storage_path),
  check (starts_with(storage_path, event_key || '/'))
);
alter table public.event_media_assets enable row level security;
revoke all on public.event_media_assets from public, anon, authenticated;
grant select, insert, update on public.event_media_assets to service_role;
