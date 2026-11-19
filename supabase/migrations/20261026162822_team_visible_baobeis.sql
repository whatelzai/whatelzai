-- Explicit product policy change: team-readable by default, owner-editable.
-- No browser table grants or chat/vault access are added.
alter table public.member_leads add column visibility text not null default 'team'
 check (visibility in ('team','private'));
alter table public.member_briefings add column visibility text not null default 'team'
 check (visibility in ('team','private'));

create function public.can_read_member_lead(p_viewer uuid,p_lead uuid)
returns boolean language sql stable security invoker set search_path='' as $$
 select exists (
  select 1 from public.member_leads l where l.id=p_lead and (
   l.owner_id=p_viewer or (l.visibility='team'
    and exists(select 1 from public.business_team_accounts a
     join public.business_team_accounts b on b.team_id=a.team_id
     where a.user_id=l.owner_id and b.user_id=p_viewer)
    and not exists(select 1 from public.member_lead_visibility v
     where v.owner_id=l.owner_id and v.recipient_id=p_viewer
      and (v.mode='none' or (v.mode='selected' and not(l.id=any(v.lead_ids)))))
   )
  )
 );
$$;
create or replace function public.shared_member_lead_ids(p_recipient uuid)
returns table(id uuid,owner_id uuid) language sql stable security invoker set search_path='' as $$
 select l.id,l.owner_id from public.member_leads l
 where l.owner_id<>p_recipient and public.can_read_member_lead(p_recipient,l.id)
 order by l.id;
$$;

create function public.can_read_member_briefing(p_viewer uuid,p_note uuid)
returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.member_briefings n where n.id=p_note and (
  n.owner_id=p_viewer or (n.visibility='team'
   and exists(select 1 from public.business_team_accounts a
    join public.business_team_accounts b on b.team_id=a.team_id
    where a.user_id=n.owner_id and b.user_id=p_viewer)
   and not exists(select 1 from public.member_briefing_shares s
    where s.briefing_id=n.id and s.recipient_user_id=p_viewer and s.revoked_at is not null)
   and not exists(select 1 from unnest(n.lead_ids) x(id)
    where not public.can_read_member_lead(p_viewer,x.id))
  )
 ));
$$;
create function public.shared_member_briefing_ids(p_recipient uuid)
returns table(id uuid,owner_id uuid) language sql stable security invoker set search_path='' as $$
 select n.id,n.owner_id from public.member_briefings n
 where n.owner_id<>p_recipient and public.can_read_member_briefing(p_recipient,n.id)
 order by n.id;
$$;

-- A member can prepare their own note for a visible sideline Baobei. Linking
-- never transfers profile ownership; hiding any linked profile suppresses the
-- entire note for readers who cannot see that profile.
create or replace function public.check_briefing_leads() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='UPDATE' and (new.owner_id<>old.owner_id or new.id<>old.id) then
  raise exception 'Briefing identity is immutable';
 end if;
 if exists(select 1 from unnest(new.lead_ids) x(id)
  where not public.can_read_member_lead(new.owner_id,x.id)) then
  raise exception 'Lead unavailable';
 end if;
 return new;
end $$;

revoke all on function public.can_read_member_lead(uuid,uuid),
 public.can_read_member_briefing(uuid,uuid),public.shared_member_briefing_ids(uuid),
 public.shared_member_lead_ids(uuid) from public,anon,authenticated;
grant execute on function public.can_read_member_lead(uuid,uuid),
 public.can_read_member_briefing(uuid,uuid),public.shared_member_briefing_ids(uuid),
 public.shared_member_lead_ids(uuid) to service_role;

comment on table public.member_leads is 'Owner-editable Baobeis, same-team readable by default through service-only permission functions; explicit hiding and recipient exclusions apply.';
comment on table public.member_briefings is 'Owner-editable HQH/HHH; team-readable by default unless hidden, excluded or linked to an unreadable Baobei.';
