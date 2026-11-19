create table public.member_ai_title_jobs (
 conversation_id uuid primary key,
 user_id uuid not null,
 original_title text not null,
 model text not null,
 status text not null default 'running' check(status in ('running','completed','failed','uncertain','preserved')),
 claimed_at timestamptz not null default now(),
 finished_at timestamptz,
 input_tokens integer not null default 0 check(input_tokens>=0),
 output_tokens integer not null default 0 check(output_tokens>=0),
 charge_micro bigint not null default 0 check(charge_micro between 0 and 2000),
 foreign key(conversation_id,user_id) references public.member_ai_conversations(id,user_id)
);
create index member_ai_title_jobs_owner on public.member_ai_title_jobs(user_id,claimed_at);
alter table public.member_ai_title_jobs enable row level security;
revoke all on public.member_ai_title_jobs from public,anon,authenticated;
grant select,insert,update on public.member_ai_title_jobs to service_role;

create function public.claim_member_ai_title(p_user uuid,p_conversation uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.member_ai_conversations; first_message public.member_ai_messages;
begin
 -- Small global lock serializes operational quota and same-conversation claims.
 perform pg_catalog.pg_advisory_xact_lock(175,1);
 select * into c from public.member_ai_conversations where id=p_conversation and user_id=p_user for update;
 if not found then raise exception 'Conversation unavailable'; end if;
 if exists(select 1 from public.member_ai_title_jobs where conversation_id=c.id) then return null; end if;
 if c.title !~ '^Conversation · [0-9]{4}-[0-9]{2}-[0-9]{2}$' then return null; end if;
 select * into first_message from public.member_ai_messages where conversation_id=c.id and user_id=p_user and role='user' order by created_at,id limit 1;
 if not found then return null; end if;
 if (select count(*) from public.member_ai_title_jobs where claimed_at>now()-interval '1 day')>=200
 or (select count(*) from public.member_ai_title_jobs where user_id=p_user and claimed_at>now()-interval '1 day')>=100 then return null; end if;
 insert into public.member_ai_title_jobs(conversation_id,user_id,original_title,model) values(c.id,p_user,c.title,'gpt-6-luna');
 return jsonb_build_object('user',left(first_message.body,1600),'assistant',coalesce((select left(body,800) from public.member_ai_messages where conversation_id=c.id and user_id=p_user and role='assistant' and created_at>=first_message.created_at order by created_at,id limit 1),''));
end $$;
create function public.finish_member_ai_title(p_user uuid,p_conversation uuid,p_title text,p_status text,p_input integer,p_output integer,p_charge bigint)
returns void language plpgsql security invoker set search_path='' as $$
declare j public.member_ai_title_jobs; changed integer;
begin
 if p_status not in ('completed','failed','uncertain') or p_input<0 or p_output<0 or p_charge not between 0 and 2000 then raise exception 'Invalid title receipt'; end if;
 if p_status='completed' and (p_title is null or length(btrim(p_title)) not between 1 and 80 or p_title ~ '[[:cntrl:]]') then raise exception 'Invalid title'; end if;
 select * into j from public.member_ai_title_jobs where conversation_id=p_conversation and user_id=p_user for update;
 if not found then raise exception 'Title job unavailable'; end if;
 if j.status<>'running' then return; end if;
 if p_status='completed' then
  update public.member_ai_conversations set title=btrim(p_title) where id=p_conversation and user_id=p_user and title=j.original_title;
  get diagnostics changed=row_count;
  if changed=0 then p_status:='preserved'; end if;
 end if;
 update public.member_ai_title_jobs set status=p_status,finished_at=now(),input_tokens=p_input,output_tokens=p_output,charge_micro=p_charge where conversation_id=p_conversation and user_id=p_user;
end $$;
revoke all on function public.claim_member_ai_title(uuid,uuid),public.finish_member_ai_title(uuid,uuid,text,text,integer,integer,bigint) from public,anon,authenticated;
grant execute on function public.claim_member_ai_title(uuid,uuid),public.finish_member_ai_title(uuid,uuid,text,text,integer,integer,bigint) to service_role;
