alter table public.member_briefings
 add column event_key text check(length(event_key) between 1 and 1024),
 add column event_month text check(event_month ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
 add constraint briefing_event_pair check((event_key is null) = (event_month is null)),
 add constraint briefing_id_owner unique(id,owner_id);
create index briefing_owner_event on public.member_briefings(owner_id,event_key) where event_key is not null;
create index briefing_owner_leads on public.member_briefings using gin(lead_ids);

create table public.member_briefing_shares (
 briefing_id uuid not null,
 owner_id uuid not null references public.users(id),
 recipient_user_id uuid not null references public.users(id),
 recipient_label text not null check(length(btrim(recipient_label)) between 1 and 120),
 shared_at timestamptz not null default now(),
 revoked_at timestamptz,
 primary key(briefing_id,recipient_user_id),
 foreign key(briefing_id,owner_id) references public.member_briefings(id,owner_id),
 check(owner_id<>recipient_user_id)
);
create index briefing_shares_recipient on public.member_briefing_shares(recipient_user_id,shared_at desc) where revoked_at is null;
alter table public.member_briefing_shares enable row level security;
revoke all on public.member_briefing_shares from public,anon,authenticated;
grant select,insert,update on public.member_briefing_shares to service_role;
