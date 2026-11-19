begin;
-- Add text answers to the version-aware writer; no field-level comment limit.
create or replace function public.submit_verified_event_feedback(p_id uuid,p_event uuid,p_verification uuid,p_token_hash text,p_form text,p_answers jsonb,p_client_hash text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare v public.event_feedback_verifications; f public.event_feedback_forms; q jsonb; a jsonb; pairs jsonb:='[]'; prior public.event_feedback; overall integer;
begin
 select * into v from public.event_feedback_verifications where id=p_verification and event_id=p_event for update;
 if not found or v.registration_id is null or v.verified_at is null or v.expires_at<=now() or v.token_hash is distinct from p_token_hash then raise exception 'FEEDBACK_VERIFICATION_REQUIRED'; end if;
 if not exists(select 1 from public.event_registrations r join public.events e on e.metadata->>'event_key'=r.event_key where r.id=v.registration_id and r.status='confirmed' and e.id=p_event and e.published and coalesce(e.metadata->>'status','') not in ('cancelled','duplicate','draft') and coalesce((e.metadata->>'ends_at')::timestamptz,(e.date::text||'T23:59:59+08:00')::timestamptz)<=now()) then raise exception 'FEEDBACK_CLOSED'; end if;
 select ff.* into f from public.event_feedback_form_bindings b join public.event_feedback_forms ff on ff.id=b.form_id where b.event_id=p_event and b.form_id=p_form;
 if not found or jsonb_typeof(p_answers) is distinct from 'object' then raise exception 'INVALID_FEEDBACK'; end if;
 if (select count(*) from jsonb_object_keys(p_answers))<>jsonb_array_length(f.questions) then raise exception 'INVALID_FEEDBACK'; end if;
 for q in select value from jsonb_array_elements(f.questions) loop
  a:=p_answers->(q->>'id');
  if q->>'type'='rating' then
   if not coalesce(jsonb_typeof(a)='number' and a::text ~ '^[1-5]$',false) then raise exception 'INVALID_FEEDBACK'; end if;
  elsif q->>'type'='yes_no' then
   if jsonb_typeof(a) is distinct from 'boolean' then raise exception 'INVALID_FEEDBACK'; end if;
  elsif q->>'type'='text' then
   if jsonb_typeof(a) is distinct from 'string' or (not coalesce((q->>'optional')::boolean,false) and length(btrim(p_answers->>(q->>'id')))=0) then raise exception 'INVALID_FEEDBACK'; end if;
  else raise exception 'INVALID_FEEDBACK'; end if;
  pairs:=pairs||jsonb_build_array(jsonb_build_object('id',q->>'id','type',q->>'type','question',q->>'text','answer',a,'low',q->>'low','high',q->>'high'));
 end loop;
 overall:=(p_answers->>(f.summary_question_id))::integer;
 if overall is null then raise exception 'INVALID_FEEDBACK'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v.email_hash,12));
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,1));
 select * into prior from public.event_feedback where id=p_id;
 if found then
  if prior.event_id<>p_event or prior.form_id is distinct from p_form or prior.email_hash is distinct from v.email_hash or prior.question_answers is distinct from pairs then raise exception 'FEEDBACK_CONFLICT'; end if;
  return true;
 end if;
 if exists(select 1 from public.event_feedback where event_id=p_event and (email_hash=v.email_hash or registration_id=v.registration_id)) then raise exception 'FEEDBACK_ALREADY_SUBMITTED'; end if;
 insert into public.event_feedback(id,event_id,rating,comment,client_hash,form_id,registration_id,email_hash,question_answers) values(p_id,p_event,overall,'',p_client_hash,p_form,v.registration_id,v.email_hash,pairs);
 return true;
end; $$;

insert into public.event_feedback_forms(id,title,summary_question_id,questions) values('feedback-v3-20261118','How was the training?','usefulness','[{"id": "format", "type": "yes_no", "text": "Do you like this mode of training?"}, {"id": "engagement", "type": "rating", "text": "How engaging was the trainer?", "low": "Not engaging", "high": "Very engaging"}, {"id": "elevator_pitch", "type": "rating", "text": "Rate the session: Elevator pitch", "low": "Poor", "high": "Excellent"}, {"id": "ai_skillset", "type": "rating", "text": "Rate the session: AI Skillset (Skill)", "low": "Poor", "high": "Excellent"}, {"id": "money_mindset", "type": "rating", "text": "Rate the session: Money Mindset (Leverage)", "low": "Poor", "high": "Excellent"}, {"id": "pace", "type": "rating", "text": "How comfortable was the pace?", "low": "Uncomfortable", "high": "Very comfortable"}, {"id": "usefulness", "type": "rating", "text": "How useful was the training overall?", "low": "Not useful", "high": "Very useful"}, {"id": "return", "type": "yes_no", "text": "Would you attend another training session?"}, {"id": "invite_friend", "type": "yes_no", "text": "Would you invite a friend to a future training session?"}, {"id": "comments", "type": "text", "text": "Any comments?", "optional": true}]');
-- Preserve any original-form submissions collected during the review pause.
create function public.snapshot_legacy_event_feedback() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.form_id is null then
  new.form_id:='feedback-v1';
  new.question_answers:=jsonb_build_array(jsonb_build_object('id','usefulness','type','rating','question','How useful was the session?','answer',new.rating),jsonb_build_object('id','comment','type','text','question','What should I keep or improve?','answer',new.comment));
 end if;
 return new;
end; $$;
revoke all on function public.snapshot_legacy_event_feedback() from public,anon,authenticated;
create trigger snapshot_legacy_event_feedback before insert on public.event_feedback for each row execute function public.snapshot_legacy_event_feedback();
update public.event_feedback set form_id='feedback-v1',question_answers=jsonb_build_array(jsonb_build_object('id','usefulness','type','rating','question','How useful was the session?','answer',rating),jsonb_build_object('id','comment','type','text','question','What should I keep or improve?','answer',comment)) where form_id is null;
-- Owner-approved replacement of the unpublished draft only. Abort if that draft has received responses.
do $$ begin
 if exists(select 1 from public.event_feedback where form_id='feedback-v2-20261118') then raise exception 'DRAFT_HAS_RESPONSES_REVIEW_REQUIRED'; end if;
end; $$;
-- These initial bindings were prepared during development, never rolled out. Preserve both version records.
alter table public.event_feedback_form_bindings disable trigger event_feedback_binding_immutable;
update public.event_feedback_form_bindings set form_id='feedback-v3-20261118' where form_id='feedback-v2-20261118';
alter table public.event_feedback_form_bindings enable trigger event_feedback_binding_immutable;
commit;
