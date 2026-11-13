-- Community participation is independent from sponsor placement and app access.
create table public.weos_communities (
 id uuid primary key default gen_random_uuid(),
 team_id uuid not null references public.business_teams(id),
 slug text not null check(slug ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
 name text not null check(length(name) between 1 and 120),
 description text not null default '' check(length(description)<=3000),
 unique(team_id,slug), unique(id,team_id)
);
create table public.weos_community_roles (
 community_id uuid not null references public.weos_communities(id),
 code text not null check(code ~ '^[a-z][a-z0-9-]{0,31}$'),
 label text not null check(length(label) between 1 and 80),
 description text not null check(length(description)<=3000),
 sort_order integer not null default 0,
 primary key(community_id,code)
);
create table public.weos_community_memberships (
 id uuid primary key default gen_random_uuid(),
 community_id uuid not null,
 team_id uuid not null,
 person_id uuid,
 lead_id uuid references public.member_leads(id),
 introducer_person_id uuid,
 role_code text not null,
 status text not null default 'active' check(status in ('active','proposed')),
 metadata jsonb not null default '{}' check(jsonb_typeof(metadata)='object'),
 revision integer not null default 1 check(revision>0),
 updated_by uuid not null references public.users(id),
 updated_at timestamptz not null default now(),
 check(person_id is not null or lead_id is not null),
 unique(community_id,person_id), unique(community_id,lead_id),
 foreign key(community_id,team_id) references public.weos_communities(id,team_id),
 foreign key(team_id,person_id) references public.business_team_people(team_id,id),
 foreign key(team_id,introducer_person_id) references public.business_team_people(team_id,id),
 foreign key(community_id,role_code) references public.weos_community_roles(community_id,code)
);
create index weos_membership_team on public.weos_community_memberships(team_id,community_id);
create index weos_membership_lead on public.weos_community_memberships(lead_id) where lead_id is not null;
alter table public.business_team_people add column abo_status text not null default 'Unknown' check(abo_status in ('Unknown','ABO','Not ABO'));
alter table public.weos_communities enable row level security;
alter table public.weos_community_roles enable row level security;
alter table public.weos_community_memberships enable row level security;
revoke all on public.weos_communities,public.weos_community_roles,public.weos_community_memberships from public,anon,authenticated;
grant select,insert,update on public.weos_communities,public.weos_community_roles,public.weos_community_memberships to service_role;
create function public.touch_community_membership() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if (new.id,new.community_id,new.team_id,new.person_id,new.lead_id) is distinct from (old.id,old.community_id,old.team_id,old.person_id,old.lead_id) then raise exception 'Membership identity cannot be changed'; end if;
 new.revision=old.revision+1; new.updated_at=now(); return new;
end;
$$;
create trigger weos_membership_revision before update on public.weos_community_memberships for each row execute function public.touch_community_membership();
revoke all on function public.touch_community_membership() from public,anon,authenticated;
grant execute on function public.touch_community_membership() to service_role;
alter table public.community_calendar_memberships drop constraint community_calendar_memberships_persona_check;
alter table public.community_calendar_memberships add constraint community_calendar_memberships_persona_check check(persona in ('Oracle','Architect','Catalyst','Spark','Guest'));
-- Referral and intended placement are plans, not actual sponsor-tree edges.
alter table public.member_leads add column referrer_person_id uuid references public.business_team_people(id);
alter table public.member_leads add column planned_sponsor_person_id uuid references public.business_team_people(id);
create function public.check_lead_placement_team() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.referrer_person_id is not null and not exists(select 1 from public.business_team_people p join public.business_team_accounts a on a.team_id=p.team_id where p.id=new.referrer_person_id and a.user_id=new.owner_id) then raise exception 'Cross-team referral'; end if;
 if new.planned_sponsor_person_id is not null and not exists(select 1 from public.business_team_people p join public.business_team_accounts a on a.team_id=p.team_id where p.id=new.planned_sponsor_person_id and a.user_id=new.owner_id) then raise exception 'Cross-team placement'; end if;
 return new;
end;
$$;
create trigger check_lead_placement before insert or update of referrer_person_id,planned_sponsor_person_id,owner_id on public.member_leads for each row execute function public.check_lead_placement_team();
revoke all on function public.check_lead_placement_team() from public,anon,authenticated;
grant execute on function public.check_lead_placement_team() to service_role;
-- A lead can be linked only to a community in its owner's assigned team.
create function public.check_community_lead_team() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.lead_id is not null and not exists(select 1 from public.member_leads l join public.business_team_accounts a on a.user_id=l.owner_id where l.id=new.lead_id and a.team_id=new.team_id) then raise exception 'Cross-team member'; end if;
 return new;
end;
$$;
create trigger weos_community_lead_team before insert or update on public.weos_community_memberships for each row execute function public.check_community_lead_team();
revoke all on function public.check_community_lead_team() from public,anon,authenticated;
grant execute on function public.check_community_lead_team() to service_role;
-- Existing Baobei membership controls remain authoritative for linked FC roles.
-- Community-only leadership is edited separately; Whatelz is never affected.
create function public.sync_lead_founder_role() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 update public.weos_community_memberships m
 set role_code=case when new.membership='Unknown' then 'guest' else lower(new.membership) end,
     status=case when new.membership='Unknown' then 'proposed' else 'active' end
 from public.weos_communities c
 where m.community_id=c.id and c.slug='founders-club' and m.lead_id=new.id
 and m.role_code not in ('architect','oracle');
 return new;
end;
$$;
create trigger sync_lead_founder_role after update of membership on public.member_leads for each row when(old.membership is distinct from new.membership) execute function public.sync_lead_founder_role();
revoke all on function public.sync_lead_founder_role() from public,anon,authenticated;
grant execute on function public.sync_lead_founder_role() to service_role;
