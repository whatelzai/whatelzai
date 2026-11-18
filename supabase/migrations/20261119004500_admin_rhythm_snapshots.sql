-- Durable last-known-good briefing; EMDEE remains canonical. Private owner access only.
create table public.admin_rhythm_snapshots (
 owner_id uuid not null references public.users(id) on delete cascade,
 kind text not null check(kind in ('morning','evening','weekly')),
 entry_key text not null,
 document_path text not null,
 body text not null check(length(body) between 1 and 1000000),
 version text not null check(version ~ '^[a-f0-9]{64}$'),
 source_updated_at timestamptz not null,
 source_created_at timestamptz not null,
 observed_at timestamptz not null default now(),
 read_version text,
 primary key(owner_id,kind)
);
alter table public.admin_rhythm_snapshots enable row level security;
revoke all on public.admin_rhythm_snapshots from public,anon,authenticated;
grant select,insert,update on public.admin_rhythm_snapshots to service_role;
create function public.save_admin_rhythm(p_owner uuid,p_kind text,p_entry text,p_path text,p_body text,p_version text,p_updated timestamptz,p_created timestamptz)
returns boolean language plpgsql security invoker set search_path='' as $$
declare saved text; label text; tag text;
begin
 if p_kind not in ('morning','evening','weekly') or p_updated > now()+interval '5 minutes' or p_created > now()+interval '5 minutes' then raise exception 'Invalid briefing'; end if;
 if (p_kind='morning' and (p_entry !~ '^\d{4}-\d{2}-\d{2}$' or p_path <> 'edmund/01-personal/01-daily/01-morning/'||p_entry||'-MORNING.md'))
 or (p_kind='evening' and (p_entry !~ '^\d{4}-\d{2}-\d{2}$' or p_path <> 'edmund/01-personal/01-daily/02-evening/'||p_entry||'-EVENING.md'))
 or (p_kind='weekly' and (p_entry !~ '^\d{4}-W\d{2}$' or p_path <> 'edmund/01-personal/01-daily/03-weeks/WEEK-'||p_entry||'.md')) then raise exception 'Invalid source path'; end if;
 insert into public.admin_rhythm_snapshots(owner_id,kind,entry_key,document_path,body,version,source_updated_at,source_created_at)
 values(p_owner,p_kind,p_entry,p_path,p_body,p_version,p_updated,p_created)
 on conflict(owner_id,kind) do update set entry_key=excluded.entry_key,document_path=excluded.document_path,body=excluded.body,version=excluded.version,source_updated_at=excluded.source_updated_at,source_created_at=excluded.source_created_at,observed_at=now()
 where excluded.entry_key > admin_rhythm_snapshots.entry_key or (excluded.entry_key=admin_rhythm_snapshots.entry_key and excluded.source_updated_at>=admin_rhythm_snapshots.source_updated_at and excluded.version<>admin_rhythm_snapshots.version)
 returning kind into saved;
 if saved is null then return false; end if;
 label := case p_kind when 'morning' then 'Morning brief' when 'evening' then 'Night debrief' else 'Weekly closeout' end;
 tag := 'rhythm-'||p_kind||'-'||left(p_version,24);
 insert into public.admin_notifications(owner_id,source_key,title,body,url,created_at)
 values(p_owner,'push:'||tag,label||' · '||p_entry,'A new saved version is ready to read.','/rhythm/'||p_kind,now()) on conflict(owner_id,source_key) do nothing;
 return true;
end $$;
revoke all on function public.save_admin_rhythm(uuid,text,text,text,text,text,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.save_admin_rhythm(uuid,text,text,text,text,text,timestamptz,timestamptz) to service_role;
