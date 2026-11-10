begin;
-- All fixtures roll back. No emails, payments or lasting attendee records.
do $$
declare a public.event_signup_attempts; b public.event_signup_attempts; ticket uuid; again uuid; n integer; k constant text:='ai-skillset-money-mindset-20261112';
begin
 if has_table_privilege('anon','public.event_people','select') or has_table_privilege('authenticated','public.event_signup_attempts','insert') or has_function_privilege('anon','public.confirm_event_signup(uuid,text,text)','execute') then raise exception 'Browser privileges exposed'; end if;
 insert into public.event_signup_codes(event_key,code_hash,max_uses,expires_at) values(k,'qa-hash',1,now()+interval '1 day');
 a:=public.reserve_event_signup('qa-token','Test attendee','qa-first@example.test','+6500000000','qa-hash');
 b:=public.reserve_event_signup('qa-token','Different input','ignored@example.test','+6500000000',null);
 if a.id<>b.id or b.email<>'qa-first@example.test' then raise exception 'Idempotency changed identity'; end if;
 ticket:=public.confirm_event_signup(a.id,null,null);
 again:=public.confirm_event_signup(a.id,null,null);
 if ticket<>again then raise exception 'Duplicate ticket'; end if;
 if (select user_id from public.event_people where email=a.email) is not null then raise exception 'Unverified auth account linked'; end if;
 begin
 perform public.reserve_event_signup('qa-token2','Other attendee','qa-second@example.test','+6500000000','qa-hash');
 raise exception 'Exhausted code accepted';
 exception when others then if sqlerrm<>'INVALID_CODE' then raise; end if;end;
 begin
 perform public.reserve_event_signup('qa-token3','Other attendee',a.email,'+6500000000',null);
 raise exception 'Duplicate email accepted';
 exception when others then if sqlerrm<>'ALREADY_REGISTERED' then raise; end if;end;
 b:=public.reserve_event_signup('qa-paid-token','Paid attendee','qa-paid@example.test','+6500000000',null);
 begin
 perform public.confirm_event_signup(b.id,'cs_wrong',null);raise exception 'Wrong session accepted';
 exception when others then if sqlerrm<>'SESSION_MISMATCH' then raise; end if;end;
 update public.event_signup_attempts set stripe_session_id='cs_qa_paid',state='checkout' where id=b.id;
 perform public.confirm_event_signup(b.id,'cs_qa_paid','pi_qa_paid');
 -- Fill remaining capacity with reservations, then prove the next is rejected.
 select count(*) into n from public.event_registrations where event_key=k and status='confirmed';
 for i in 1..(20-n) loop
  perform public.reserve_event_signup('qa-fill-'||i,'Capacity fixture','qa-fill-'||i||'@example.test','+6500000000',null);
 end loop;
 begin
 perform public.reserve_event_signup('qa-over-cap','Capacity fixture','qa-over-cap@example.test','+6500000000',null);raise exception 'Oversold event';
 exception when others then if sqlerrm<>'EVENT_FULL' then raise; end if;end;
 for i in 1..20 loop if not public.consume_event_signup_limit('qa-rate') then raise exception 'Early rate limit'; end if; end loop;
 if public.consume_event_signup_limit('qa-rate') then raise exception 'Rate limit not enforced'; end if;
end $$;
rollback;
