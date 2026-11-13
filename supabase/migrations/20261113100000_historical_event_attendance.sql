-- Historical attendance is separate from admission tickets: no invented emails or scan times.
create table public.event_attendance (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.events(id),
 display_name text not null check(length(trim(display_name)) between 1 and 200),
 person_id uuid references public.event_people(id),
 status text not null default 'checked_in' check(status in ('checked_in','cancelled')),
 attendance_on date not null,
 checked_in_at timestamptz,
 amount_minor integer not null default 0 check(amount_minor>=0),
 currency text not null default 'SGD',
 returned_later boolean not null default false,
 source text not null default 'owner_backfill',
 source_key text not null unique,
 recorded_at timestamptz not null default now(),
 recorded_by uuid not null references public.users(id)
);
create index event_attendance_event on public.event_attendance(event_id,status);
alter table public.event_attendance enable row level security;
revoke all on public.event_attendance from public,anon,authenticated;
grant select,insert,update on public.event_attendance to service_role;
