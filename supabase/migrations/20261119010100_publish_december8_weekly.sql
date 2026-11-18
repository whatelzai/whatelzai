begin;
-- Preserve test status for later QA purchases, without changing payment or ticket idempotency.
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
 insert into public.event_registrations(event_key,stripe_checkout_session_id,stripe_payment_intent_id,attendee_name,email,phone,signup_attempt_id,person_id,status,is_test)
 values(a.event_key,p_session,p_payment_intent,a.attendee_name,a.email,a.phone,a.id,person,
 case when exists(select 1 from public.event_refund_ledger where stripe_payment_intent_id=p_payment_intent) then 'cancelled' else 'confirmed' end,
 exists(select 1 from public.event_registrations prior where prior.email=a.email and prior.is_test))
 returning id into ticket;
 update public.event_signup_attempts set state='confirmed' where id=a.id;
 return ticket;
end $$;
update public.events set published=true where id='598a1db6-3c4a-4f81-9f3b-79fb8c1425aa' and metadata->>'event_id'='ELZ-EVT-0010';
update public.event_signup_offers set enabled=true where event_id='598a1db6-3c4a-4f81-9f3b-79fb8c1425aa';
commit;
