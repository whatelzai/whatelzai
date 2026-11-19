-- One lifetime welcome reset per registered application account. Granting does
-- not change usage or eligibility; redemption is explicit and assigned-user only.
alter table public.member_ai_cycles drop constraint member_ai_cycles_reason_check;
alter table public.member_ai_cycles add constraint member_ai_cycles_reason_check
  check(reason in ('monthly','weekly','owner-reset','member-reset'));

create table public.member_ai_reset_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id),
  granted_at timestamptz not null default now(),
  used_at timestamptz,
  cycle_id uuid,
  check ((used_at is null) = (cycle_id is null)),
  foreign key(cycle_id,user_id) references public.member_ai_cycles(id,user_id)
);
alter table public.member_ai_reset_credits enable row level security;
revoke all on public.member_ai_reset_credits from public,anon,authenticated;
grant select,insert,update on public.member_ai_reset_credits to service_role;

create function public.grant_welcome_member_reset()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  insert into public.member_ai_reset_credits(user_id) values(new.id)
    on conflict(user_id) do nothing;
  return new;
end $$;
revoke all on function public.grant_welcome_member_reset() from public,anon,authenticated;
grant execute on function public.grant_welcome_member_reset() to service_role;
create trigger member_welcome_reset after insert on public.users
  for each row execute function public.grant_welcome_member_reset();
insert into public.member_ai_reset_credits(user_id)
  select id from public.users on conflict(user_id) do nothing;

create function public.use_member_reset_credit(p_user uuid,p_credit uuid,p_expected_cycle uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare a public.member_ai_access; r public.member_ai_reset_credits; fresh uuid;
begin
  -- Same account lock as reservation/admin reset; credit lock comes second.
  perform public.ensure_activated_member_ai(p_user);
  select * into a from public.member_ai_access where user_id=p_user for update;
  select * into r from public.member_ai_reset_credits where id=p_credit and user_id=p_user for update;
  if not found then raise exception 'Reset unavailable'; end if;
  -- A replay returns the recorded outcome, never a second cycle.
  if r.used_at is not null then return r.cycle_id; end if;
  if a.current_cycle_id is distinct from p_expected_cycle then
    raise exception 'Allowance changed. Reload before using a reset';
  end if;
  if exists(select 1 from public.member_ai_cycles where id=a.current_cycle_id and reserved_micro>0) then
    raise exception 'Wait for the current reply to finish';
  end if;
  insert into public.member_ai_cycles(user_id,allowance_micro,ends_at,reset_by,reason)
    values(p_user,1000000,now()+interval '7 days',p_user,'member-reset') returning id into fresh;
  update public.member_ai_access set current_cycle_id=fresh,updated_at=now() where user_id=p_user;
  update public.member_ai_reset_credits set used_at=now(),cycle_id=fresh where id=r.id;
  return fresh;
end $$;
revoke all on function public.use_member_reset_credit(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.use_member_reset_credit(uuid,uuid,uuid) to service_role;
