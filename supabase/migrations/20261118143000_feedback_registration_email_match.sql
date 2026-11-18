begin;
-- Preserve the identity assurance of historical responses. Email matching does not prove ownership.
alter table public.event_feedback add column identity_method text;
update public.event_feedback set identity_method=case when registration_id is not null then 'verified_email' else 'anonymous' end;
alter table public.event_feedback add constraint event_feedback_identity_method check(identity_method in ('anonymous','verified_email','email_match'));
create function public.submit_registered_event_feedback(p_id uuid,p_event uuid,p_email text,p_email_hash text,p_form text,p_answers jsonb,p_client_hash text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare matched_registration uuid; f public.event_feedback_forms; q jsonb; a jsonb; pairs jsonb:='[]'; prior public.event_feedback; overall integer;
begin
 if p_email is null or p_email<>lower(btrim(p_email)) or p_email_hash !~ '^[a-f0-9]{64}$' then raise exception 'FEEDBACK_REGISTRATION_REQUIRED'; end if;
 select r.id into matched_registration from public.event_registrations r join public.events e on e.metadata->>'event_key'=r.event_key where e.id=p_event and r.status='confirmed' and lower(btrim(r.email))=p_email order by r.created_at,r.id limit 1;
 if matched_registration is null then raise exception 'FEEDBACK_REGISTRATION_REQUIRED'; end if;
 if not exists(select 1 from public.event_registrations r join public.events e on e.metadata->>'event_key'=r.event_key where r.id=matched_registration and r.status='confirmed' and e.id=p_event and e.published and coalesce(e.metadata->>'status','') not in ('cancelled','duplicate','draft') and coalesce((e.metadata->>'ends_at')::timestamptz,(e.date::text||'T23:59:59+08:00')::timestamptz)<=now()) then raise exception 'FEEDBACK_CLOSED'; end if;
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

revoke all on function public.submit_registered_event_feedback(uuid,uuid,text,text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.submit_registered_event_feedback(uuid,uuid,text,text,text,jsonb,text) to service_role;
comment on function public.submit_registered_event_feedback(uuid,uuid,text,text,text,jsonb,text) is 'Service-only event registration email match; deliberately no email ownership verification. Immutable form snapshots and per-event deduplication retained.';
commit;
