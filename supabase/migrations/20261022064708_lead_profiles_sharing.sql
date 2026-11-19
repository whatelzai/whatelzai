alter table public.member_leads add column photo_path text;
create table public.member_lead_visibility (
 owner_id uuid not null references public.users(id),
 recipient_id uuid not null references public.users(id),
 mode text not null default 'none' check(mode in ('none','all','selected')),
 lead_ids uuid[] not null default '{}',
 revision integer not null default 1 check(revision > 0),
 updated_at timestamptz not null default now(),
 primary key(owner_id,recipient_id), check(owner_id <> recipient_id),
 check(cardinality(lead_ids) <= 500),
 check(mode = 'selected' or cardinality(lead_ids) = 0)
);
create index member_lead_visibility_recipient on public.member_lead_visibility(recipient_id,owner_id);
alter table public.member_lead_visibility enable row level security;
revoke all on public.member_lead_visibility from public,anon,authenticated;
grant select,insert,update on public.member_lead_visibility to service_role;

-- Invoker functions are only callable by the trusted application. Identity is
-- always derived from the verified assigned session before calling them.
create function public.set_member_lead_visibility(p_owner uuid,p_recipient uuid,p_mode text,p_ids uuid[],p_revision integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
 if p_mode <> 'none' then
  if not exists(select 1 from public.business_team_accounts a join public.business_team_accounts b on b.team_id=a.team_id where a.user_id=p_owner and b.user_id=p_recipient) then
   raise exception 'Recipient must have an activated account on your team';
  end if;
  if exists(select 1 from unnest(p_ids) x where not exists(select 1 from public.member_leads l where l.id=x and l.owner_id=p_owner)) then
   raise exception 'Selection includes an unavailable lead';
  end if;
 end if;
 if p_revision=0 then
  insert into public.member_lead_visibility(owner_id,recipient_id,mode,lead_ids)
  values(p_owner,p_recipient,p_mode,p_ids) on conflict do nothing;
  return found;
 end if;
 update public.member_lead_visibility set mode=p_mode,lead_ids=p_ids,revision=revision+1,updated_at=now()
 where owner_id=p_owner and recipient_id=p_recipient and revision=p_revision;
 return found;
end $$;
revoke all on function public.set_member_lead_visibility(uuid,uuid,text,uuid[],integer) from public,anon,authenticated;
grant execute on function public.set_member_lead_visibility(uuid,uuid,text,uuid[],integer) to service_role;

create function public.shared_member_lead_ids(p_recipient uuid)
returns table(id uuid,owner_id uuid) language sql stable security invoker set search_path = '' as $$
 select l.id,l.owner_id from public.member_leads l
 join public.member_lead_visibility v on v.owner_id=l.owner_id
 where v.recipient_id=p_recipient and (v.mode='all' or (v.mode='selected' and l.id=any(v.lead_ids)))
 and exists(select 1 from public.business_team_accounts a join public.business_team_accounts b on a.team_id=b.team_id where a.user_id=v.owner_id and b.user_id=p_recipient);
$$;
revoke all on function public.shared_member_lead_ids(uuid) from public,anon,authenticated;
grant execute on function public.shared_member_lead_ids(uuid) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('lead-photos','lead-photos',false,3145728,array['image/webp'])
on conflict(id) do nothing;
-- No browser storage policies: uploads/downloads use the authenticated app,
-- checking lead ownership or an explicit current read grant on every request.
