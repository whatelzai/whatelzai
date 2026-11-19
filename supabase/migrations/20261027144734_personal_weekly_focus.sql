create table public.personal_weekly_focus (
 owner_id uuid not null references public.users(id),
 week_of date not null check(extract(isodow from week_of)=1),
 title text not null check(length(title) between 1 and 240),
 area smallint not null check(area between 1 and 8),
 done boolean not null default false,
 revision integer not null default 1 check(revision>=1),
 updated_at timestamptz not null default now(),
 primary key(owner_id,week_of)
);
alter table public.personal_weekly_focus enable row level security;
revoke all on public.personal_weekly_focus from public,anon,authenticated;
grant select,insert,update on public.personal_weekly_focus to service_role;
