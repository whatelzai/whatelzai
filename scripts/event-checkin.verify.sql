-- Transactional QA only: every fixture is rolled back. No emails or Stripe orders.
begin;
do $$
declare ticket uuid; actor uuid; affected int;
begin
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('event_registrations','event_staff','event_refund_ledger') and not c.relrowsecurity) then raise exception 'RLS missing'; end if;
 if has_table_privilege('anon','public.event_registrations','SELECT') or has_table_privilege('authenticated','public.event_registrations','UPDATE') or has_table_privilege('authenticated','public.event_staff','INSERT') then raise exception 'Browser grants present'; end if;
 select id into actor from public.users where role in ('superadmin','admin') limit 1;
 if actor is null then raise exception 'No actor available for transaction-only QA'; end if;
 insert into public.event_registrations(event_key,stripe_checkout_session_id,attendee_name,email,phone) values ('qa_transaction_only','cs_test_qa_transaction_only','QA transaction only','qa@example.invalid','+6500000000') returning id into ticket;
 insert into public.event_registrations(event_key,stripe_checkout_session_id,attendee_name,email,phone) values ('qa_transaction_only','cs_test_qa_transaction_only','Duplicate QA','qa@example.invalid','+6500000000') on conflict(stripe_checkout_session_id) do nothing;
 if (select count(*) from public.event_registrations where stripe_checkout_session_id='cs_test_qa_transaction_only')<>1 then raise exception 'Duplicate ticket'; end if;
 update public.event_registrations set checked_in_at=now(),checked_in_by=actor where id=ticket and event_key='qa_transaction_only' and status='confirmed' and checked_in_at is null;
 get diagnostics affected=row_count;
 if affected<>1 then raise exception 'First check-in failed'; end if;
 update public.event_registrations set checked_in_at=now(),checked_in_by=actor where id=ticket and event_key='qa_transaction_only' and status='confirmed' and checked_in_at is null;
 get diagnostics affected=row_count;
 if affected<>0 then raise exception 'Duplicate check-in accepted'; end if;
 update public.event_registrations set status='cancelled',checked_in_at=null,checked_in_by=null where id=ticket;
 update public.event_registrations set checked_in_at=now(),checked_in_by=actor where id=ticket and status='confirmed' and checked_in_at is null;
 get diagnostics affected=row_count;
 if affected<>0 then raise exception 'Cancelled ticket accepted'; end if;
 update public.event_registrations set checked_in_at=now(),checked_in_by=actor where id=ticket and event_key='wrong_event' and status='confirmed' and checked_in_at is null;
 get diagnostics affected=row_count;
 if affected<>0 then raise exception 'Wrong event accepted'; end if;
end $$;
rollback;
select 'RLS, grants, ticket uniqueness, duplicate check-in, cancellation and event isolation passed; fixtures rolled back' as verification;
