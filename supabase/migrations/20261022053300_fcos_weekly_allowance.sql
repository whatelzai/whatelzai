-- Preserve history and existing consumption while switching the current budget.
-- Lock the same access/cycle tables used by reservation and settlement.
lock table public.member_ai_access, public.member_ai_cycles in share row exclusive mode;
alter table public.member_ai_access alter column allowance_micro set default 1000000;
alter table public.member_ai_cycles drop constraint member_ai_cycles_reason_check;
alter table public.member_ai_cycles add constraint member_ai_cycles_reason_check check(reason in ('monthly','weekly','owner-reset'));
do $$ begin
  if exists(select 1 from public.member_ai_cycles c join public.member_ai_access a on a.current_cycle_id=c.id
    where c.ends_at>now() and c.spent_micro+c.reserved_micro>1000000)
  then raise exception 'Current consumption exceeds the new allowance; review before migrating'; end if;
end $$;
update public.member_ai_cycles c set allowance_micro=1000000,ends_at=c.started_at+interval '7 days'
  from public.member_ai_access a where a.current_cycle_id=c.id and c.ends_at>now();
update public.member_ai_access set allowance_micro=1000000,updated_at=now();

-- Tree activation grants ordinary Chat eligibility. Seven-day baseline is USD1.
create or replace function public.ensure_activated_member_ai(p_user uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare a public.member_ai_access;
begin
  if not exists (
    select 1 from public.users u
    join public.business_team_accounts b on b.user_id=u.id
    join public.business_teams t on t.id=b.team_id
    where u.id=p_user and u.supabase_auth_user_id is not null
      and coalesce(u.email,'')<>'' and t.slug='whatelz-network'
  ) then raise exception 'Tree activation required'; end if;
  insert into public.member_ai_access as existing(user_id,active,allowance_micro)
    values(p_user,true,1000000)
    on conflict(user_id) do update set active=true,allowance_micro=1000000,updated_at=now()
      where not existing.active or existing.allowance_micro<>1000000;
  select * into a from public.member_ai_access where user_id=p_user;
  return to_jsonb(a);
end $$;

-- One transaction for the reviewed target set. Stable lock order and current-cycle
-- comparisons prevent partial bulk grants and duplicated credit on stale retries.
create or replace function public.reset_activated_member_ai(p_actor uuid,p_targets jsonb,p_amount bigint,p_scope text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare ids uuid[]; live_ids uuid[]; target record; a public.member_ai_access;
  fresh uuid; result jsonb:='[]'::jsonb;
begin
  if not exists(select 1 from public.users where id=p_actor and role in ('admin','superadmin'))
    then raise exception 'Owner required'; end if;
  if p_amount is null or p_amount not in (500000,1000000) or p_scope is null or p_scope not in ('selected','all')
    then raise exception 'Invalid reset amount or scope'; end if;
  if jsonb_typeof(p_targets) is distinct from 'array' then raise exception 'Invalid targets'; end if;
  if jsonb_array_length(p_targets) not between 1 and 1000 then raise exception 'Choose 1 to 1000 activated accounts'; end if;
  select array_agg(user_id order by user_id) into ids
    from jsonb_to_recordset(p_targets) as x(user_id uuid,expected_cycle uuid);
  if array_position(ids,null) is not null or cardinality(ids)<>(select count(distinct id) from unnest(ids) id)
    then raise exception 'Invalid or duplicate targets'; end if;
  if p_scope='all' then
    select coalesce(array_agg(u.id order by u.id),'{}'::uuid[]) into live_ids
      from public.users u join public.business_team_accounts b on b.user_id=u.id
      join public.business_teams t on t.id=b.team_id
      where t.slug='whatelz-network' and u.supabase_auth_user_id is not null and coalesce(u.email,'')<>'';
    if ids is distinct from live_ids then raise exception 'Activated roster changed. Reload before resetting'; end if;
  end if;
  for target in select * from jsonb_to_recordset(p_targets) as x(user_id uuid,expected_cycle uuid) order by user_id loop
    perform public.ensure_activated_member_ai(target.user_id);
    select * into a from public.member_ai_access where user_id=target.user_id for update;
    if a.current_cycle_id is distinct from target.expected_cycle then raise exception 'Allowance changed. Reload before resetting'; end if;
    insert into public.member_ai_cycles(user_id,allowance_micro,ends_at,reset_by,reason)
      values(target.user_id,p_amount,
        now()+interval '7 days',
        p_actor,'owner-reset') returning id into fresh;
    update public.member_ai_access set current_cycle_id=fresh,updated_at=now() where user_id=target.user_id;
    insert into public.member_ai_admin_events(actor_id,user_id,action) values(p_actor,target.user_id,'reset');
    result:=result||jsonb_build_array(jsonb_build_object('user_id',target.user_id,'cycle_id',fresh,'allowance_micro',p_amount));
  end loop;
  return result;
end $$;

-- Preserve the old signature, but make its full reset obey current activation.
create or replace function public.reset_member_ai(p_actor uuid,p_user uuid,p_expected_cycle uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare r jsonb;
begin
  r:=public.reset_activated_member_ai(p_actor,jsonb_build_array(jsonb_build_object('user_id',p_user,'expected_cycle',p_expected_cycle)),1000000,'selected');
  return (r->0->>'cycle_id')::uuid;
end $$;

revoke all on function public.ensure_activated_member_ai(uuid),public.reset_activated_member_ai(uuid,jsonb,bigint,text) from public,anon,authenticated;
grant execute on function public.ensure_activated_member_ai(uuid),public.reset_activated_member_ai(uuid,jsonb,bigint,text) to service_role;

-- Recheck activation at reservation as well as at the server boundary.
create or replace function public.reserve_member_ai(p_user uuid,p_request uuid,p_conversation uuid,p_text text,p_reserve bigint,p_model text)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare a member_ai_access; c member_ai_cycles; r member_ai_requests; cutoff timestamptz;
begin
  perform public.ensure_activated_member_ai(p_user);
  select * into a from member_ai_access where user_id=p_user for update;
  if not found or not a.active then raise exception 'Pilot access required'; end if;
  if a.model<>p_model then raise exception 'Model changed. Retry'; end if;
  if char_length(p_text) not between 1 and 6000 or p_reserve not between 1 and 1000000 then raise exception 'Invalid request'; end if;
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
    cutoff := case when c.id is null then now()+interval '7 days' else c.ends_at+(floor(extract(epoch from (now()-c.ends_at))/604800)::bigint+1)*interval '7 days' end;
    insert into member_ai_cycles(user_id,allowance_micro,started_at,ends_at,reason) values(p_user,a.allowance_micro,cutoff-interval '7 days',cutoff,'weekly') returning * into c;
    update member_ai_access set current_cycle_id=c.id where user_id=p_user;
  end if;
  if c.spent_micro+c.reserved_micro+p_reserve>c.allowance_micro then raise exception 'AI allowance reached'; end if;
  update member_ai_cycles set reserved_micro=reserved_micro+p_reserve where id=c.id;
  insert into member_ai_requests(id,user_id,conversation_id,cycle_id,model,reserved_micro) values(p_request,p_user,p_conversation,c.id,a.model,p_reserve);
  insert into member_ai_messages(user_id,conversation_id,request_id,role,body) values(p_user,p_conversation,p_request,'user',p_text);
  return jsonb_build_object('duplicate',false,'model',a.model,'cycle_id',c.id);
end $$;
