begin;
-- Immutable configurations and bindings: new questions belong to a new version/event.
create table public.event_feedback_forms (
 id text primary key check(id ~ '^[a-z0-9-]{1,80}$'),
 title text not null check(length(title) between 1 and 120),
 summary_question_id text not null,
 questions jsonb not null check(jsonb_typeof(questions)='array' and jsonb_array_length(questions) between 1 and 20),
 created_at timestamptz not null default now()
);
create table public.event_feedback_form_bindings (
 event_id uuid primary key references public.events(id),
 form_id text not null references public.event_feedback_forms(id),
 created_at timestamptz not null default now()
);
create function public.keep_event_feedback_version() returns trigger language plpgsql security invoker set search_path='' as $$
begin raise exception 'FEEDBACK_VERSION_IMMUTABLE'; end; $$;
create trigger event_feedback_form_immutable before update or delete on public.event_feedback_forms for each row execute function public.keep_event_feedback_version();
create trigger event_feedback_binding_immutable before update or delete on public.event_feedback_form_bindings for each row execute function public.keep_event_feedback_version();
revoke all on function public.keep_event_feedback_version() from public,anon,authenticated;
create table public.event_feedback_verifications (
 id uuid primary key,
 event_id uuid not null references public.events(id),
 registration_id uuid references public.event_registrations(id),
 email_hash text not null check(email_hash ~ '^[a-f0-9]{64}$'),
 code_hash text not null check(code_hash ~ '^[a-f0-9]{64}$'),
 client_hash text not null check(client_hash ~ '^[a-f0-9]{64}$'),
 attempts smallint not null default 0 check(attempts between 0 and 5),
 token_hash text check(token_hash ~ '^[a-f0-9]{64}$'),
 verified_at timestamptz,
 expires_at timestamptz not null default now()+interval '10 minutes',
 created_at timestamptz not null default now()
);
create index event_feedback_verification_email on public.event_feedback_verifications(email_hash,created_at desc);
create index event_feedback_verification_client on public.event_feedback_verifications(client_hash,created_at desc);
alter table public.event_feedback add column form_id text references public.event_feedback_forms(id),
 add column registration_id uuid references public.event_registrations(id),
 add column email_hash text check(email_hash ~ '^[a-f0-9]{64}$'),
 add column question_answers jsonb;
create unique index event_feedback_verified_once on public.event_feedback(event_id,email_hash) where email_hash is not null;
create unique index event_feedback_registration_once on public.event_feedback(event_id,registration_id) where registration_id is not null;
-- Preserve the exact original anonymous question/answer content. Never assign it a guessed attendee.
insert into public.event_feedback_forms(id,title,summary_question_id,questions) values('feedback-v1','How was the session?','usefulness', '[{"id":"usefulness","type":"rating","text":"How useful was the session?","low":"Not useful","high":"Excellent"},{"id":"comment","type":"text","text":"What should I keep or improve?","optional":true}]');
update public.event_feedback set form_id='feedback-v1',question_answers=jsonb_build_array(jsonb_build_object('id','usefulness','type','rating','question','How useful was the session?','answer',rating),jsonb_build_object('id','comment','type','text','question','What should I keep or improve?','answer',comment));
-- The new registered-email rule supersedes anonymous submissions, including cached old forms.
revoke execute on function public.submit_event_feedback(uuid,uuid,integer,text,text) from service_role;

create function public.issue_event_feedback_code(p_id uuid,p_event uuid,p_registration uuid,p_email_hash text,p_code_hash text,p_client_hash text)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_client_hash,10));
 perform pg_advisory_xact_lock(hashtextextended(p_email_hash,11));
 if (select count(*) from public.event_feedback_verifications where client_hash=p_client_hash and created_at>now()-interval '1 hour')>=20
 or (select count(*) from public.event_feedback_verifications where email_hash=p_email_hash and created_at>now()-interval '1 hour')>=3
 or exists(select 1 from public.event_feedback_verifications where email_hash=p_email_hash and created_at>now()-interval '60 seconds') then raise exception 'FEEDBACK_RATE_LIMIT'; end if;
 if p_registration is not null and not exists(select 1 from public.event_registrations r join public.events e on e.metadata->>'event_key'=r.event_key where r.id=p_registration and e.id=p_event and r.status='confirmed') then raise exception 'INVALID_REGISTRATION'; end if;
 insert into public.event_feedback_verifications(id,event_id,registration_id,email_hash,code_hash,client_hash) values(p_id,p_event,p_registration,p_email_hash,p_code_hash,p_client_hash);
 return true;
end; $$;
create function public.verify_event_feedback_code(p_id uuid,p_event uuid,p_code_hash text,p_token_hash text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare v public.event_feedback_verifications;
begin
 select * into v from public.event_feedback_verifications where id=p_id and event_id=p_event for update;
 if not found or v.expires_at<=now() or v.attempts>=5 or v.verified_at is not null then return false; end if;
 update public.event_feedback_verifications set attempts=attempts+1 where id=p_id;
 if v.registration_id is null or v.code_hash<>p_code_hash or not exists(select 1 from public.event_registrations where id=v.registration_id and status='confirmed') then return false; end if;
 update public.event_feedback_verifications set token_hash=p_token_hash,verified_at=now(),expires_at=now()+interval '30 minutes' where id=p_id;
 return true;
end; $$;
create function public.submit_verified_event_feedback(p_id uuid,p_event uuid,p_verification uuid,p_token_hash text,p_form text,p_answers jsonb,p_client_hash text)
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

alter table public.event_feedback_forms enable row level security;
alter table public.event_feedback_form_bindings enable row level security;
alter table public.event_feedback_verifications enable row level security;
revoke all on public.event_feedback_forms,public.event_feedback_form_bindings,public.event_feedback_verifications from public,anon,authenticated;
grant select,insert on public.event_feedback_forms,public.event_feedback_form_bindings to service_role;
grant select,insert,update on public.event_feedback_verifications to service_role;
revoke all on function public.issue_event_feedback_code(uuid,uuid,uuid,text,text,text),public.verify_event_feedback_code(uuid,uuid,text,text),public.submit_verified_event_feedback(uuid,uuid,uuid,text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.issue_event_feedback_code(uuid,uuid,uuid,text,text,text),public.verify_event_feedback_code(uuid,uuid,text,text),public.submit_verified_event_feedback(uuid,uuid,uuid,text,text,jsonb,text) to service_role;

insert into public.event_feedback_forms(id,title,summary_question_id,questions) values('feedback-v2-20261118','How was the session?','usefulness','[{"id": "format", "type": "yes_no", "text": "Do you like this mode of training?"}, {"id": "engagement", "type": "rating", "text": "How engaging was the trainer?", "low": "Not engaging", "high": "Very engaging"}, {"id": "usefulness", "type": "rating", "text": "How useful was the session overall?", "low": "Not useful", "high": "Very useful"}, {"id": "clarity", "type": "rating", "text": "How easy was the session to follow?", "low": "Difficult", "high": "Very easy"}, {"id": "relevance", "type": "rating", "text": "How relevant was the session to you?", "low": "Not relevant", "high": "Very relevant"}, {"id": "examples", "type": "rating", "text": "How helpful were the practical examples?", "low": "Not helpful", "high": "Very helpful"}, {"id": "pace", "type": "rating", "text": "How comfortable was the pace of the session?", "low": "Uncomfortable", "high": "Very comfortable"}, {"id": "questions", "type": "rating", "text": "How much opportunity was there to ask questions?", "low": "Not enough", "high": "Plenty"}, {"id": "apply", "type": "yes_no", "text": "Do you plan to try something you learned?"}, {"id": "return", "type": "yes_no", "text": "Would you attend another session?"}]');
insert into public.event_feedback_form_bindings(event_id,form_id)
select id,'feedback-v2-20261118' from public.events where metadata->>'event_id' in ('ELZ-EVT-0004','ELZ-EVT-0006','ELZ-EVT-0007','ELZ-EVT-0008','ELZ-EVT-0009');
commit;
