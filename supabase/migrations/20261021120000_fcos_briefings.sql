create table public.member_briefings (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.users(id),
 kind text not null check(kind in ('HQH','HHH')),
 title text not null check(length(btrim(title)) between 1 and 180),
 event_name text not null default '' check(length(event_name)<=240),
 occurred_on date not null,
 lead_ids uuid[] not null default '{}' check(cardinality(lead_ids)<=20),
 observations text not null default '' check(length(observations)<=12000),
 reflections text not null default '' check(length(reflections)<=12000),
 next_steps text not null default '' check(length(next_steps)<=6000),
 status text not null default 'draft' check(status in ('draft','reviewed')),
 revision integer not null default 1 check(revision>0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index member_briefings_owner_updated on public.member_briefings(owner_id,updated_at desc);
alter table public.member_briefings enable row level security;
revoke all on public.member_briefings from public,anon,authenticated;
grant select,insert,update on public.member_briefings to service_role;
create function public.check_briefing_leads() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='UPDATE' and (new.owner_id<>old.owner_id or new.id<>old.id) then raise exception 'Briefing identity is immutable'; end if;
 if exists(select 1 from unnest(new.lead_ids) as x(id) where not exists(select 1 from public.member_leads l where l.id=x.id and l.owner_id=new.owner_id)) then raise exception 'Lead unavailable'; end if;
 return new;
end $$;
revoke all on function public.check_briefing_leads() from public,anon,authenticated;
create trigger check_briefing_leads before insert or update on public.member_briefings for each row execute function public.check_briefing_leads();
