begin;
-- Private operational records. No client grants or seeded personal activity.
create table public.personal_tool_records (
 owner_id uuid not null references public.users(id) on delete cascade,
 id uuid not null,
 kind text not null check (kind in ('payday','meditation','practice','training','routine')),
 occurred_on date not null,
 data jsonb not null check (jsonb_typeof(data)='object' and octet_length(data::text)<=20000 and data ? 'kind' and data->>'kind'=kind),
 revision integer not null default 1 check(revision>0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(owner_id,id)
);
create index personal_tool_records_recent on public.personal_tool_records(owner_id,kind,occurred_on desc,id);
create unique index personal_tool_payday_income on public.personal_tool_records(owner_id,((data->>'income_id'))) where kind='payday';
alter table public.personal_tool_records enable row level security;
revoke all on public.personal_tool_records from public,anon,authenticated;
grant select,insert,update on public.personal_tool_records to service_role;
create function public.personal_tool_save(p_owner uuid,p_id uuid,p_kind text,p_day date,p_data jsonb,p_revision integer)
returns setof public.personal_tool_records language plpgsql security invoker set search_path=public as $$
declare old public.personal_tool_records;
begin
 if p_revision=0 then
  insert into personal_tool_records(owner_id,id,kind,occurred_on,data)
  values(p_owner,p_id,p_kind,p_day,p_data) on conflict do nothing;
 else
  update personal_tool_records set data=p_data,occurred_on=p_day,revision=revision+1,updated_at=now()
  where owner_id=p_owner and id=p_id and kind=p_kind and revision=p_revision;
 end if;
 select * into old from personal_tool_records where owner_id=p_owner and id=p_id;
 if old.kind=p_kind and old.occurred_on=p_day and old.data=p_data then
  return next old;
 else raise exception 'Record changed; reload before saving' using errcode='40001';
 end if;
end $$;
revoke all on function public.personal_tool_save(uuid,uuid,text,date,jsonb,integer) from public,anon,authenticated;
grant execute on function public.personal_tool_save(uuid,uuid,text,date,jsonb,integer) to service_role;

commit;
