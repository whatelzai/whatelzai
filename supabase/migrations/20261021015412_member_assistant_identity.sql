-- Membership and ownership use immutable users.id. Email is contact data only.
create table public.member_ai_access (
  user_id uuid primary key references public.users(id),
  active boolean not null default false,
  model text not null default 'gpt-6-luna' check (model in ('gpt-6-luna','gpt-6.1-sol')),
  allowance_micro bigint not null default 5000000 check (allowance_micro between 0 and 5000000),
  current_cycle_id uuid,
  updated_at timestamptz not null default now()
);
create table public.member_ai_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.member_ai_access(user_id),
  allowance_micro bigint not null check (allowance_micro between 0 and 5000000),
  spent_micro bigint not null default 0 check (spent_micro >= 0),
  reserved_micro bigint not null default 0 check (reserved_micro >= 0),
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  reset_by uuid references public.users(id),
  reason text not null check (reason in ('monthly','owner-reset')),
  unique(id,user_id),
  check (spent_micro + reserved_micro <= allowance_micro)
);
alter table public.member_ai_access add foreign key(current_cycle_id,user_id) references public.member_ai_cycles(id,user_id);
create table public.member_ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  title text not null check (char_length(title) between 1 and 100),
  created_at timestamptz not null default now(),
  unique(id,user_id)
);
create index member_ai_conversations_owner_idx on public.member_ai_conversations(user_id,created_at desc);
create table public.member_ai_requests (
  id uuid primary key,
  user_id uuid not null references public.users(id),
  conversation_id uuid not null,
  cycle_id uuid not null,
  model text not null,
  status text not null default 'running' check (status in ('running','completed','failed')),
  reserved_micro bigint not null check (reserved_micro > 0),
  charged_micro bigint not null default 0 check (charged_micro >= 0 and charged_micro <= reserved_micro),
  uncertain boolean not null default false,
  input_tokens integer not null default 0 check(input_tokens >= 0),
  output_tokens integer not null default 0 check(output_tokens >= 0),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  foreign key(conversation_id,user_id) references public.member_ai_conversations(id,user_id),
  foreign key(cycle_id,user_id) references public.member_ai_cycles(id,user_id),
  unique(id,user_id,conversation_id)
);
create index member_ai_requests_owner_idx on public.member_ai_requests(user_id,started_at desc);
create table public.member_ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  conversation_id uuid not null,
  request_id uuid not null,
  role text not null check(role in ('user','assistant')),
  body text not null check(char_length(body) between 1 and 20000),
  proposals jsonb not null default '[]'::jsonb check(jsonb_typeof(proposals)='array' and jsonb_array_length(proposals)<=3),
  created_at timestamptz not null default now(),
  foreign key(request_id,user_id,conversation_id) references public.member_ai_requests(id,user_id,conversation_id),
  unique(request_id,role)
);
create index member_ai_messages_conversation_idx on public.member_ai_messages(user_id,conversation_id,created_at);
-- Persistent 1:1 link; disconnecting credentials must not silently reassign identity.
create table public.member_emdee_links (
  user_id uuid primary key references public.users(id),
  issuer text not null check(issuer='https://emdee.tech'),
  subject text not null unique,
  vault_id uuid not null unique,
  handle text,
  parent_path text not null,
  encrypted_credentials text,
  linked_at timestamptz not null default now()
);
-- Account/vault identity is immutable even when two confirmations race.
create function public.guard_member_emdee_identity() returns trigger language plpgsql set search_path=public as $$
begin
  if new.user_id is distinct from old.user_id or new.issuer is distinct from old.issuer or new.subject is distinct from old.subject or new.vault_id is distinct from old.vault_id then
    raise exception 'Verified identity cannot be reassigned';
  end if;
  return new;
end $$;
create trigger member_emdee_identity_immutable before update on public.member_emdee_links for each row execute function public.guard_member_emdee_identity();
create table public.member_emdee_pending (
  user_id uuid primary key references public.users(id),
  encrypted_state text not null,
  created_at timestamptz not null default now()
);
create table public.member_ai_admin_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.users(id),
  user_id uuid not null references public.users(id),
  action text not null check(action in ('activate','pause','reset','model')),
  created_at timestamptz not null default now()
);

-- Atomic reservation serializes sends, enforces allowance and deduplicates retries.
create function public.reserve_member_ai(p_user uuid,p_request uuid,p_conversation uuid,p_text text,p_reserve bigint,p_model text)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare a member_ai_access; c member_ai_cycles; r member_ai_requests; cutoff timestamptz;
begin
  select * into a from member_ai_access where user_id=p_user for update;
  if not found or not a.active then raise exception 'Pilot access required'; end if;
  if a.model<>p_model then raise exception 'Model changed. Retry'; end if;
  if char_length(p_text) not between 1 and 6000 or p_reserve not between 1 and 5000000 then raise exception 'Invalid request'; end if;
  if not exists(select 1 from member_ai_conversations where id=p_conversation and user_id=p_user) then raise exception 'Conversation unavailable'; end if;
  select * into r from member_ai_requests where id=p_request;
  if found then
    if r.user_id<>p_user or r.conversation_id<>p_conversation then raise exception 'Request unavailable'; end if;
    return jsonb_build_object('duplicate',true,'status',r.status,'model',r.model);
  end if;
  if (select count(*) from member_ai_requests where user_id=p_user and started_at>now()-interval '1 hour')>=30 then raise exception 'Hourly message limit reached'; end if;
  if exists(select 1 from member_ai_requests where user_id=p_user and status='running' and started_at>now()-interval '5 minutes') then raise exception 'A reply is already being prepared'; end if;
  if (select count(*) from member_ai_messages where user_id=p_user and conversation_id=p_conversation)>=100 then raise exception 'Start a new conversation to continue'; end if;
  select * into c from member_ai_cycles where id=a.current_cycle_id and user_id=p_user;
  if not found or c.ends_at<=now() then
    cutoff := (date_trunc('month',timezone('Asia/Singapore',now()))+interval '1 month') at time zone 'Asia/Singapore';
    insert into member_ai_cycles(user_id,allowance_micro,ends_at,reason) values(p_user,a.allowance_micro,cutoff,'monthly') returning * into c;
    update member_ai_access set current_cycle_id=c.id where user_id=p_user;
  end if;
  if c.spent_micro+c.reserved_micro+p_reserve>c.allowance_micro then raise exception 'AI allowance reached'; end if;
  update member_ai_cycles set reserved_micro=reserved_micro+p_reserve where id=c.id;
  insert into member_ai_requests(id,user_id,conversation_id,cycle_id,model,reserved_micro) values(p_request,p_user,p_conversation,c.id,a.model,p_reserve);
  insert into member_ai_messages(user_id,conversation_id,request_id,role,body) values(p_user,p_conversation,p_request,'user',p_text);
  return jsonb_build_object('duplicate',false,'model',a.model,'cycle_id',c.id);
end $$;

create function public.finish_member_ai(p_user uuid,p_request uuid,p_body text,p_charge bigint,p_input integer,p_output integer,p_failed boolean,p_uncertain boolean,p_proposals jsonb)
returns void language plpgsql security invoker set search_path=public as $$
declare r member_ai_requests;
begin
  select * into r from member_ai_requests where id=p_request and user_id=p_user for update;
  if not found then raise exception 'Request unavailable'; end if;
  if r.status<>'running' then return; end if;
  if p_charge<0 or p_charge>r.reserved_micro or p_input<0 or p_output<0 or (not p_failed and char_length(coalesce(p_body,'')) not between 1 and 20000) then raise exception 'Invalid settlement'; end if;
  -- Unknown provider outcomes retain the reservation. They never create free retries.
  if not p_uncertain then
    update member_ai_cycles set reserved_micro=reserved_micro-r.reserved_micro,spent_micro=spent_micro+p_charge where id=r.cycle_id and user_id=p_user;
  end if;
  update member_ai_requests set status=case when p_failed then 'failed' else 'completed' end,charged_micro=case when p_uncertain then 0 else p_charge end,uncertain=p_uncertain,input_tokens=p_input,output_tokens=p_output,finished_at=now() where id=r.id;
  if not p_failed then
    insert into member_ai_messages(user_id,conversation_id,request_id,role,body,proposals) values(p_user,r.conversation_id,r.id,'assistant',p_body,p_proposals);
  end if;
end $$;

create function public.reset_member_ai(p_actor uuid,p_user uuid,p_expected_cycle uuid)
returns uuid language plpgsql security invoker set search_path=public as $$
declare a member_ai_access; fresh uuid;
begin
  -- Configured sole-owner policy is additionally checked in the calling action.
  if not exists(select 1 from users where id=p_actor and role in ('admin','superadmin')) then raise exception 'Owner required'; end if;
  select * into a from member_ai_access where user_id=p_user for update;
  if not found or a.current_cycle_id is distinct from p_expected_cycle then raise exception 'Allowance changed. Reload before resetting'; end if;
  insert into member_ai_cycles(user_id,allowance_micro,ends_at,reset_by,reason) values(p_user,a.allowance_micro,(date_trunc('month',timezone('Asia/Singapore',now()))+interval '1 month') at time zone 'Asia/Singapore',p_actor,'owner-reset') returning id into fresh;
  update member_ai_access set current_cycle_id=fresh,updated_at=now() where user_id=p_user;
  insert into member_ai_admin_events(actor_id,user_id,action) values(p_actor,p_user,'reset');
  return fresh;
end $$;

do $$ declare t text; begin
  foreach t in array array['member_ai_access','member_ai_cycles','member_ai_conversations','member_ai_requests','member_ai_messages','member_emdee_links','member_emdee_pending','member_ai_admin_events'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select,insert,update,delete on public.%I to service_role',t);
  end loop;
end $$;
revoke all on function public.reserve_member_ai(uuid,uuid,uuid,text,bigint,text),public.finish_member_ai(uuid,uuid,text,bigint,integer,integer,boolean,boolean,jsonb),public.reset_member_ai(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.reserve_member_ai(uuid,uuid,uuid,text,bigint,text),public.finish_member_ai(uuid,uuid,text,bigint,integer,integer,boolean,boolean,jsonb),public.reset_member_ai(uuid,uuid,uuid) to service_role;
