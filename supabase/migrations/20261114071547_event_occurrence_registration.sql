begin;
create table public.event_signup_offers (
 event_key text primary key,
 event_id uuid not null unique references public.events(id),
 amount integer not null check(amount in (700,800)),
 currency text not null default 'sgd' check(currency='sgd'),
 capacity integer not null check(capacity between 1 and 1000),
 closes_at timestamptz not null,
 enabled boolean not null default false
);
alter table public.event_signup_offers enable row level security;
revoke all on public.event_signup_offers from public,anon,authenticated;
grant select,insert,update on public.event_signup_offers to service_role;
alter table public.event_signup_attempts drop constraint event_signup_attempts_amount_check;
alter table public.event_signup_attempts add constraint event_signup_attempts_amount_check check(amount in (0,700,800));
create function public.reserve_event_signup_for_event(p_event_key text,p_request_hash text,p_name text,p_email text,p_phone text,p_code_hash text)
returns public.event_signup_attempts language plpgsql security invoker set search_path='' as $$
declare a public.event_signup_attempts; c public.event_signup_codes; n integer; k text := p_event_key; o public.event_signup_offers;
begin
 perform pg_advisory_xact_lock(hashtextextended(k,0));
 select * into a from public.event_signup_attempts where request_hash=p_request_hash;
 if found then
  if a.event_key is distinct from k then raise exception 'EVENT_MISMATCH'; end if;
  return a;
 end if;
 select * into o from public.event_signup_offers where event_key=k and enabled;
 if not found or now()>=o.closes_at then raise exception 'REGISTRATION_CLOSED'; end if;
 if exists(select 1 from public.event_registrations where event_key=k and lower(email)=p_email and status='confirmed') then raise exception 'ALREADY_REGISTERED'; end if;
 if exists(select 1 from public.event_signup_attempts where event_key=k and email=p_email and state in ('reserved','checkout')) then raise exception 'REGISTRATION_PENDING'; end if;
 select count(*) into n from public.event_registrations where event_key=k and status='confirmed';
 n:=n+(select count(*) from public.event_signup_attempts where event_key=k and state in ('reserved','checkout'));
 if n>=o.capacity then raise exception 'EVENT_FULL'; end if;
 if p_code_hash is not null then
  select * into c from public.event_signup_codes where event_key=k and code_hash=p_code_hash and enabled and expires_at>now();
  if not found then raise exception 'INVALID_CODE'; end if;
  select count(*) into n from public.event_signup_attempts where event_key=k and code_hash=p_code_hash and state in ('reserved','checkout','confirmed');
  if n>=c.max_uses then raise exception 'INVALID_CODE'; end if;
 end if;
 insert into public.event_signup_attempts(request_hash,event_key,attendee_name,email,phone,amount,code_hash)
 values(p_request_hash,k,p_name,p_email,p_phone,case when p_code_hash is null then o.amount else 0 end,p_code_hash) returning * into a;
 return a;
end $$;

create or replace function public.confirm_event_signup(p_attempt uuid,p_session text,p_payment_intent text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare a public.event_signup_attempts; person uuid; ticket uuid;
begin
 select * into a from public.event_signup_attempts where id=p_attempt;
 if not found then raise exception 'INVALID_REGISTRATION'; end if;
 perform pg_advisory_xact_lock(hashtextextended(a.event_key,0));
 select * into a from public.event_signup_attempts where id=p_attempt for update;
 if not found or a.state='released' then raise exception 'INVALID_REGISTRATION'; end if;
 if a.amount>0 and (p_session is null or a.stripe_session_id is distinct from p_session) then raise exception 'SESSION_MISMATCH'; end if;
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
revoke all on function public.reserve_event_signup_for_event(text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.reserve_event_signup_for_event(text,text,text,text,text,text) to service_role;
comment on table public.event_signup_offers is 'Private organizer-activated occurrence inventory. Does not reuse another event offer or promo.';
commit;
