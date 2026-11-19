begin;
alter table public.event_feedback_forms add column comment_prompt text check(comment_prompt is null or length(comment_prompt) between 1 and 240);
insert into public.event_feedback_forms(id,title,summary_question_id,questions,comment_prompt) values('feedback-v4-20261119','How was the training?','usefulness','[{"id": "format", "type": "yes_no", "text": "Do you like this mode of training?"}, {"id": "engagement", "type": "rating", "text": "How engaging was the trainer?", "low": "Not engaging", "high": "Very engaging"}, {"id": "elevator_pitch", "type": "rating", "text": "Rate the session: Elevator pitch", "low": "Poor", "high": "Excellent"}, {"id": "ai_skillset", "type": "rating", "text": "Rate the session: AI Skillset (Skill)", "low": "Poor", "high": "Excellent"}, {"id": "money_mindset", "type": "rating", "text": "Rate the session: Money Mindset (Leverage)", "low": "Poor", "high": "Excellent"}, {"id": "pace", "type": "rating", "text": "How comfortable was the pace?", "low": "Uncomfortable", "high": "Very comfortable"}, {"id": "usefulness", "type": "rating", "text": "How useful was the training overall?", "low": "Not useful", "high": "Very useful"}, {"id": "return", "type": "yes_no", "text": "Would you attend another training session?"}, {"id": "invite_friend", "type": "yes_no", "text": "Would you invite a friend to a future training session?"}, {"id": "future_topic", "type": "single_select", "text": "What other topics would you like to be trained on?", "options": ["AI Skillset", "Money Mindset", "Passive Income Strategies", "Entrepreneurial Secrets", "Others"], "otherOption": "Others"}]','Any comments?');
create or replace function public.submit_registered_event_feedback(p_id uuid,p_event uuid,p_email text,p_email_hash text,p_form text,p_answers jsonb,p_client_hash text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare matched_registration uuid; f public.event_feedback_forms; q jsonb; a jsonb; pairs jsonb:='[]'; prior public.event_feedback; overall integer;
begin
 if p_email is null or p_email<>lower(btrim(p_email)) or p_email_hash !~ '^[a-f0-9]{64}$' then raise exception 'FEEDBACK_REGISTRATION_REQUIRED'; end if;
 select r.id into matched_registration from public.event_registrations r join public.events e on e.metadata->>'event_key'=r.event_key where e.id=p_event and r.status='confirmed' and lower(btrim(r.email))=p_email order by r.created_at,r.id limit 1;
 if matched_registration is null then raise exception 'FEEDBACK_REGISTRATION_REQUIRED'; end if;
 if not exists(select 1 from public.event_registrations r join public.events e on e.metadata->>'event_key'=r.event_key where r.id=matched_registration and r.status='confirmed' and e.id=p_event and e.published and coalesce(e.metadata->>'status','') not in ('cancelled','duplicate','draft') and coalesce((e.metadata->>'ends_at')::timestamptz,(e.date::text||'T23:59:59+08:00')::timestamptz)<=now()) then raise exception 'FEEDBACK_CLOSED'; end if;
 select ff.* into f from public.event_feedback_form_bindings b join public.event_feedback_forms ff on ff.id=b.form_id where b.event_id=p_event and b.form_id=p_form;
 if not found or jsonb_typeof(p_answers) is distinct from 'object' then raise exception 'INVALID_FEEDBACK'; end if;
 if (select count(*) from jsonb_object_keys(p_answers))<>jsonb_array_length(f.questions)+(case when f.comment_prompt is null then 0 else 1 end) then raise exception 'INVALID_FEEDBACK'; end if;
 for q in select value from jsonb_array_elements(f.questions) loop
  a:=p_answers->(q->>'id');
  if q->>'type'='rating' then
   if not coalesce(jsonb_typeof(a)='number' and a::text ~ '^[1-5]$',false) then raise exception 'INVALID_FEEDBACK'; end if;
  elsif q->>'type'='yes_no' then
   if jsonb_typeof(a) is distinct from 'boolean' then raise exception 'INVALID_FEEDBACK'; end if;
  elsif q->>'type'='single_select' then
   if jsonb_typeof(a) is distinct from 'string' then raise exception 'INVALID_FEEDBACK'; end if;
   if not (exists(select 1 from jsonb_array_elements_text(q->'options') choice where choice = p_answers->>(q->>'id') and choice is distinct from q->>'otherOption') or (q->>'otherOption' is not null and starts_with(p_answers->>(q->>'id'),(q->>'otherOption')||': ') and length(btrim(substring(p_answers->>(q->>'id') from length(q->>'otherOption')+3)))>0)) then raise exception 'INVALID_FEEDBACK'; end if;
  elsif q->>'type'='text' then
   if jsonb_typeof(a) is distinct from 'string' or (not coalesce((q->>'optional')::boolean,false) and length(btrim(p_answers->>(q->>'id')))=0) then raise exception 'INVALID_FEEDBACK'; end if;
  else raise exception 'INVALID_FEEDBACK'; end if;
  pairs:=pairs||jsonb_build_array(jsonb_build_object('id',q->>'id','type',q->>'type','question',q->>'text','answer',a,'low',q->>'low','high',q->>'high')||case when q->>'type'='single_select' then jsonb_build_object('options',q->'options') else '{}'::jsonb end);
 end loop;
 if f.comment_prompt is not null then
  if jsonb_typeof(p_answers->'comments') is distinct from 'string' then raise exception 'INVALID_FEEDBACK'; end if;
  pairs:=pairs||jsonb_build_array(jsonb_build_object('id','comments','type','text','question',f.comment_prompt,'answer',p_answers->'comments'));
 end if;
 overall:=(p_answers->>(f.summary_question_id))::integer;
 if overall is null then raise exception 'INVALID_FEEDBACK'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_email_hash,12));
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,1));
 select * into prior from public.event_feedback where id=p_id;
 if found then
  if prior.event_id<>p_event or prior.form_id is distinct from p_form or prior.email_hash is distinct from p_email_hash or prior.question_answers is distinct from pairs then raise exception 'FEEDBACK_CONFLICT'; end if;
  return true;
 end if;
 if exists(select 1 from public.event_feedback where event_id=p_event and (email_hash=p_email_hash or registration_id=matched_registration)) then raise exception 'FEEDBACK_ALREADY_SUBMITTED'; end if;
 insert into public.event_feedback(id,event_id,rating,comment,client_hash,form_id,registration_id,email_hash,question_answers,identity_method) values(p_id,p_event,overall,'',p_client_hash,p_form,matched_registration,p_email_hash,pairs,'email_match');
 return true;
end; $$;

commit;
