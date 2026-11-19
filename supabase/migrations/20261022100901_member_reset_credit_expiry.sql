-- Expiry is recorded with the grant, not extended on sign-in or page reads.
alter table public.member_ai_reset_credits add column expires_at timestamptz;
update public.member_ai_reset_credits set expires_at=granted_at+interval '7 days'
  where expires_at is null;
alter table public.member_ai_reset_credits alter column expires_at set not null;
alter table public.member_ai_reset_credits alter column expires_at set default (now()+interval '7 days');
alter table public.member_ai_reset_credits add constraint member_reset_expiry_after_grant
  check(expires_at>granted_at);

create or replace function public.use_member_reset_credit(p_user uuid,p_credit uuid,p_expected_cycle uuid)
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
  if r.expires_at <= clock_timestamp() then raise exception 'Reset expired'; end if;
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
