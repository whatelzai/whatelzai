begin;
-- First-party attendee records are prospective profiles, not authentication accounts.
create table public.event_people (
 id uuid primary key default gen_random_uuid(),
 email text not null unique check(email=lower(trim(email))),
 name text not null,
 phone text not null,
 user_id uuid unique references public.users(id),
 created_at timestamptz not null default now()
);
create table public.event_signup_codes (
 event_key text not null,
 code_hash text not null,
 enabled boolean not null default true,
 max_uses integer not null check(max_uses>0),
 expires_at timestamptz not null,
 primary key(event_key,code_hash)
);
create table public.event_signup_attempts (
 id uuid primary key default gen_random_uuid(),
 request_hash text not null unique,
 event_key text not null,
 attendee_name text not null,
 email text not null check(email=lower(trim(email))),
 phone text not null,
 amount integer not null check(amount in (0,700)),
 code_hash text,
 state text not null default 'reserved' check(state in ('reserved','checkout','confirmed','released')),
 stripe_session_id text unique,
 payment_started_at timestamptz,
 created_at timestamptz not null default now()
);
create index event_signup_capacity on public.event_signup_attempts(event_key,state);
create table public.event_signup_limits (
 key_hash text primary key,
 requests integer not null,
 window_start timestamptz not null default now()
);
update public.event_registrations set email=lower(trim(email)) where email<>lower(trim(email));
alter table public.event_registrations alter column stripe_checkout_session_id drop not null;
alter table public.event_registrations add column signup_attempt_id uuid unique references public.event_signup_attempts(id);
alter table public.event_registrations add column person_id uuid references public.event_people(id);
create index event_registrations_person on public.event_registrations(person_id);

alter table public.event_people enable row level security;
alter table public.event_signup_codes enable row level security;
alter table public.event_signup_attempts enable row level security;
alter table public.event_signup_limits enable row level security;
revoke all on public.event_people,public.event_signup_codes,public.event_signup_attempts,public.event_signup_limits from public,anon,authenticated;
grant select,insert,update on public.event_people,public.event_signup_codes,public.event_signup_attempts,public.event_signup_limits to service_role;

-- Separate transaction: failed promo/reservation attempts still consume a limit.
create function public.consume_event_signup_limit(p_key text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 delete from public.event_signup_limits where window_start<now()-interval '7 days';
 insert into public.event_signup_limits(key_hash,requests) values(p_key,1)
 on conflict(key_hash) do update set requests=case when event_signup_limits.window_start<now()-interval '1 hour' then 1 else event_signup_limits.requests+1 end,
 window_start=case when event_signup_limits.window_start<now()-interval '1 hour' then now() else event_signup_limits.window_start end returning requests into n;
 return n<=20;
end $$;
revoke all on function public.consume_event_signup_limit(text) from public,anon,authenticated;
grant execute on function public.consume_event_signup_limit(text) to service_role;
grant delete on public.event_signup_limits to service_role;

-- All registrations share one serialized event inventory, including legacy tickets.
-- Only the trusted server can execute these invoker functions.
create function public.reserve_event_signup(p_request_hash text,p_name text,p_email text,p_phone text,p_code_hash text)
returns public.event_signup_attempts language plpgsql security invoker set search_path='' as $$
declare a public.event_signup_attempts; c public.event_signup_codes; n integer; k constant text := 'ai-skillset-money-mindset-20261112';
begin
 perform pg_advisory_xact_lock(hashtextextended(k,0));
 select * into a from public.event_signup_attempts where request_hash=p_request_hash;
 if found then return a; end if;
 if now()>='2026-11-12 11:30:00+00'::timestamptz then raise exception 'REGISTRATION_CLOSED'; end if;
 if exists(select 1 from public.event_registrations where event_key=k and lower(email)=p_email and status='confirmed') then raise exception 'ALREADY_REGISTERED'; end if;
 if exists(select 1 from public.event_signup_attempts where event_key=k and email=p_email and state in ('reserved','checkout')) then raise exception 'REGISTRATION_PENDING'; end if;
 select count(*) into n from public.event_registrations where event_key=k and status='confirmed';
 n:=n+(select count(*) from public.event_signup_attempts where event_key=k and state in ('reserved','checkout'));
 if n>=20 then raise exception 'EVENT_FULL'; end if;
 if p_code_hash is not null then
  select * into c from public.event_signup_codes where event_key=k and code_hash=p_code_hash and enabled and expires_at>now();
  if not found then raise exception 'INVALID_CODE'; end if;
  select count(*) into n from public.event_signup_attempts where event_key=k and code_hash=p_code_hash and state in ('reserved','checkout','confirmed');
  if n>=c.max_uses then raise exception 'INVALID_CODE'; end if;
 end if;
 insert into public.event_signup_attempts(request_hash,event_key,attendee_name,email,phone,amount,code_hash)
 values(p_request_hash,k,p_name,p_email,p_phone,case when p_code_hash is null then 700 else 0 end,p_code_hash) returning * into a;
 return a;
end $$;

create function public.confirm_event_signup(p_attempt uuid,p_session text,p_payment_intent text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare a public.event_signup_attempts; person uuid; ticket uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended('ai-skillset-money-mindset-20261112',0));
 select * into a from public.event_signup_attempts where id=p_attempt for update;
 if not found or a.state='released' then raise exception 'INVALID_REGISTRATION'; end if;
 if a.amount=700 and (p_session is null or a.stripe_session_id is distinct from p_session) then raise exception 'SESSION_MISMATCH'; end if;
 if a.amount=0 and p_session is not null then raise exception 'SESSION_MISMATCH'; end if;
 select id into ticket from public.event_registrations where signup_attempt_id=a.id;
 if found then return ticket; end if;
 insert into public.event_people(email,name,phone) values(a.email,a.attendee_name,a.phone)
 on conflict(email) do nothing;
 select id into person from public.event_people where email=a.email;
 insert into public.event_registrations(event_key,stripe_checkout_session_id,stripe_payment_intent_id,attendee_name,email,phone,signup_attempt_id,person_id,status)
 values(a.event_key,p_session,p_payment_intent,a.attendee_name,a.email,a.phone,a.id,person,
 case when exists(select 1 from public.event_refund_ledger where stripe_payment_intent_id=p_payment_intent) then 'cancelled' else 'confirmed' end)
 returning id into ticket;
 update public.event_signup_attempts set state='confirmed' where id=a.id;
 return ticket;
end $$;
revoke all on function public.reserve_event_signup(text,text,text,text,text),public.confirm_event_signup(uuid,text,text) from public,anon,authenticated;
grant execute on function public.reserve_event_signup(text,text,text,text,text),public.confirm_event_signup(uuid,text,text) to service_role;
commit;
