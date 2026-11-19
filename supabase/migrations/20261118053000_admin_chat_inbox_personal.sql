-- Owner-only Admin history, separate from member chat and its credit system.
alter table public.daily_tasks drop constraint daily_tasks_lane_check;
alter table public.daily_tasks add constraint daily_tasks_lane_check check(lane in ('day-job','ai-business','network-marketing','personal'));
create table public.admin_chat_threads (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.users(id),
 title text not null check(length(title) between 1 and 160), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,owner_id)
);
create index admin_chat_threads_owner on public.admin_chat_threads(owner_id,updated_at desc,id);
create table public.admin_chat_turns (
 id uuid primary key, owner_id uuid not null references public.users(id), thread_id uuid not null,
 user_text text not null check(length(user_text) between 1 and 6000), reply text check(length(reply)<=20000), proposal jsonb,
 status text not null default 'pending' check(status in ('pending','complete','failed')),
 applied_task_id uuid references public.daily_tasks(id), applied_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(thread_id,owner_id) references public.admin_chat_threads(id,owner_id)
);
create index admin_chat_turns_history on public.admin_chat_turns(owner_id,thread_id,created_at,id);
create unique index admin_chat_one_pending on public.admin_chat_turns(thread_id) where status='pending';
create table public.admin_notifications (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.users(id),source_key text not null check(length(source_key)<=500),
 title text not null check(length(title) between 1 and 240), body text not null default '' check(length(body)<=2000),url text not null check(url like '/%' and url not like '//%'),
 created_at timestamptz not null default now(),read_at timestamptz,archived_at timestamptz,unique(owner_id,source_key)
);
create index admin_notifications_owner on public.admin_notifications(owner_id,created_at desc,id) where archived_at is null;
alter table public.admin_chat_threads enable row level security;
alter table public.admin_chat_turns enable row level security;
alter table public.admin_notifications enable row level security;
revoke all on public.admin_chat_threads,public.admin_chat_turns,public.admin_notifications from public,anon,authenticated;
grant select,insert,update on public.admin_chat_threads,public.admin_chat_turns,public.admin_notifications to service_role;
create function public.apply_admin_chat_proposal(p_owner uuid,p_turn uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.admin_chat_turns; p jsonb; task_id uuid; changed uuid; stamp date := (now() at time zone 'Asia/Singapore')::date;
begin
 select * into r from public.admin_chat_turns where id=p_turn and owner_id=p_owner for update;
 if not found or r.status<>'complete' or r.proposal is null then raise exception 'Proposal unavailable'; end if;
 if r.applied_task_id is not null then return r.applied_task_id; end if;
 p := r.proposal;
 if p->>'lane' not in ('personal','ai-business','network-marketing','day-job') or p->>'status' not in ('proposed','open','blocked','waiting','done') or length(btrim(p->>'title')) not between 1 and 240 then raise exception 'Invalid proposal'; end if;
 if p->>'operation'='create' then
  insert into public.daily_tasks(owner_id,title,lane,due_on,status,accepted_on,completed_at,completed_on)
  values(p_owner,btrim(p->>'title'),p->>'lane',(p->>'due_on')::date,p->>'status',case when p->>'status'<>'proposed' then stamp end,case when p->>'status'='done' then now() end,case when p->>'status'='done' then stamp end) returning id into task_id;
 elsif p->>'operation'='update' then
  task_id := (p->>'id')::uuid;
  update public.daily_tasks set title=btrim(p->>'title'),lane=p->>'lane',due_on=(p->>'due_on')::date,status=p->>'status',
   accepted_on=case when p->>'status'='proposed' then null else coalesce(accepted_on,stamp) end,
   completed_at=case when p->>'status'='done' then coalesce(completed_at,now()) end,
   completed_on=case when p->>'status'='done' then coalesce(completed_on,stamp) end,
   revision=revision+1,updated_at=now()
  where id=task_id and owner_id=p_owner and revision=(p->>'revision')::integer returning id into changed;
  if changed is null then raise exception 'Task changed; refresh the proposal'; end if;
 else raise exception 'Invalid operation'; end if;
 update public.admin_chat_turns set applied_task_id=task_id,applied_at=now() where id=p_turn and owner_id=p_owner;
 return task_id;
end $$;
revoke all on function public.apply_admin_chat_proposal(uuid,uuid) from public,anon,authenticated;
grant execute on function public.apply_admin_chat_proposal(uuid,uuid) to service_role;
