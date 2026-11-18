begin;
-- Owner explicitly requested this email as a free checked-in test attendee on19 November2026.
-- Restore its existing cancelled test ticket rather than inventing a duplicate or changing a paid receipt.
do $$
declare t public.event_registrations; a public.event_signup_attempts;
begin
 select * into t from public.event_registrations where id='1a27b260-6b81-4789-a2ea-20f81ce6cd2b' and event_key='ai-skillset-money-mindset-20261112' and email='elz.news22@gmail.com' for update;
 if not found or t.checked_in_at is null or t.checked_in_by is null or t.stripe_checkout_session_id is not null or t.stripe_payment_intent_id is not null then raise exception 'TEST_REGISTRATION_REVIEW_REQUIRED'; end if;
 select * into a from public.event_signup_attempts where id=t.signup_attempt_id for update;
 if not found or a.amount<>0 or a.stripe_session_id is not null then raise exception 'TEST_PAYMENT_REVIEW_REQUIRED'; end if;
 update public.event_registrations set status='confirmed',is_test=true,attendee_name='Edmund (test)' where id=t.id;
 update public.event_signup_attempts set state='confirmed' where id=a.id;
end $$;
commit;
