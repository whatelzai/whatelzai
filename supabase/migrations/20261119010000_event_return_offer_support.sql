begin;
alter table public.event_registrations add column is_test boolean not null default false;
alter table public.event_signup_offers drop constraint event_signup_offers_amount_check;
alter table public.event_signup_offers add constraint event_signup_offers_amount_check check(amount in (700,800,1300));
alter table public.event_signup_offers add column return_amount integer check(return_amount is null or (return_amount>0 and return_amount<amount));
alter table public.event_signup_attempts drop constraint event_signup_attempts_amount_check;
alter table public.event_signup_attempts add constraint event_signup_attempts_amount_check check(amount in (0,700,800,1300));

create table public.event_return_offers (
 id uuid primary key default gen_random_uuid(),
 feedback_id uuid not null references public.event_feedback(id),
 source_event_id uuid not null references public.events(id),
 target_event_id uuid not null references public.events(id),
 email text not null check(email=lower(btrim(email))),
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz not null,
 claimed_at timestamptz,
 dismissed_at timestamptz,
 attempt_id uuid unique references public.event_signup_attempts(id),
 created_at timestamptz not null default now(),
 unique(feedback_id,target_event_id),
 unique(target_event_id,email)
);
alter table public.event_return_offers enable row level security;
revoke all on public.event_return_offers from public,anon,authenticated;
grant select,insert,update on public.event_return_offers to service_role;
alter table public.event_signup_attempts add column return_offer_id uuid references public.event_return_offers(id);

create function public.issue_event_return_offer(p_feedback uuid,p_target uuid,p_token_hash text)
returns public.event_return_offers language plpgsql security invoker set search_path='' as $$
declare f public.event_feedback; r public.event_registrations; o public.event_signup_offers; result public.event_return_offers;
begin
 select * into f from public.event_feedback where id=p_feedback;
 if not found or f.registration_id is null or f.created_at<=now()-interval '5 minutes' then return null; end if;
 select * into r from public.event_registrations where id=f.registration_id and status='confirmed';
 if not found then return null; end if;
 select * into o from public.event_signup_offers where event_id=p_target and enabled and closes_at>now() and return_amount is not null;
 if not found or p_target=f.event_id then return null; end if;
 if not exists(select 1 from public.event_registrations prior where lower(btrim(prior.email))=r.email and prior.status='confirmed' and prior.checked_in_at is not null and prior.checked_in_at<=f.created_at and prior.event_key<>o.event_key) then return null; end if;
 if exists(select 1 from public.event_registrations where event_key=o.event_key and email=r.email and status='confirmed') then return null; end if;
 insert into public.event_return_offers(feedback_id,source_event_id,target_event_id,email,token_hash,expires_at)
 values(f.id,f.event_id,p_target,r.email,p_token_hash,f.created_at+interval '5 minutes')
 on conflict(target_event_id,email) do nothing;
 select * into result from public.event_return_offers where target_event_id=p_target and email=r.email and token_hash=p_token_hash;
 return result;
end $$;

create function public.claim_event_return_offer(p_token_hash text)
returns public.event_return_offers language plpgsql security invoker set search_path='' as $$
declare result public.event_return_offers;
begin
 select * into result from public.event_return_offers where token_hash=p_token_hash for update;
 if not found or result.expires_at<=now() or result.dismissed_at is not null then raise exception 'RETURN_OFFER_EXPIRED'; end if;
 if not exists(select 1 from public.event_signup_offers o where o.event_id=result.target_event_id and o.enabled and o.closes_at>now()) then raise exception 'REGISTRATION_CLOSED'; end if;
 update public.event_return_offers set claimed_at=coalesce(claimed_at,now()) where id=result.id returning * into result;
 return result;
end $$;

create function public.reserve_event_signup_with_return(p_event_key text,p_request_hash text,p_name text,p_email text,p_phone text,p_token_hash text)
returns public.event_signup_attempts language plpgsql security invoker set search_path='' as $$
declare a public.event_signup_attempts; r public.event_return_offers; o public.event_signup_offers;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_event_key,0));
 select * into a from public.event_signup_attempts where request_hash=p_request_hash;
 if found then
  if a.event_key<>p_event_key or a.email<>p_email or a.return_offer_id is null then raise exception 'RETURN_OFFER_MISMATCH'; end if;
  return a;
 end if;
 select * into r from public.event_return_offers where token_hash=p_token_hash for update;
 if not found or r.dismissed_at is not null or r.claimed_at is null or r.expires_at<=now() then raise exception 'RETURN_OFFER_EXPIRED'; end if;
 select * into o from public.event_signup_offers where event_id=r.target_event_id and event_key=p_event_key and enabled and return_amount is not null and closes_at>now();
 if not found or r.email<>p_email then raise exception 'RETURN_OFFER_MISMATCH'; end if;
 if r.attempt_id is not null then raise exception 'REGISTRATION_PENDING'; end if;
 if not exists(select 1 from public.event_registrations prior where lower(btrim(prior.email))=p_email and prior.status='confirmed' and prior.checked_in_at is not null and prior.event_key<>p_event_key) then raise exception 'RETURN_OFFER_MISMATCH'; end if;
 a:=public.reserve_event_signup_for_event(p_event_key,p_request_hash,p_name,p_email,p_phone,null);
 update public.event_signup_attempts set amount=o.return_amount,return_offer_id=r.id where id=a.id returning * into a;
 update public.event_return_offers set attempt_id=a.id where id=r.id;
 return a;
end $$;
revoke all on function public.issue_event_return_offer(uuid,uuid,text),public.claim_event_return_offer(text),public.reserve_event_signup_with_return(text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.issue_event_return_offer(uuid,uuid,text),public.claim_event_return_offer(text),public.reserve_event_signup_with_return(text,text,text,text,text,text) to service_role;
comment on table public.event_return_offers is 'Private five-minute checked-in attendee incentive. Email-bound opaque capability, one fixed deadline per person and target event; REJOIN text alone grants nothing.';
insert into public.events(id,type,slug,name,date,location,published,metadata) values('598a1db6-3c4a-4f81-9f3b-79fb8c1425aa','training','money-mindset-ai-skillset-december8-2026','Money Mindset × AI Skillset','2026-12-08',null,false,'{"event_id": "ELZ-EVT-0010", "event_key": "ai-skillset-money-mindset-20261208", "status": "scheduled", "event_format": "weekly", "topic": "combined", "public_visibility": "listed", "starts_at": "2026-12-08T19:30:00+08:00", "ends_at": "2026-12-08T21:30:00+08:00", "capacity": 30, "currency": "SGD", "price_minor": 1300, "reference_price_minor": 9700, "stripe_price_id": "price_1UdCJdPA71qp9sGS4LjMPe9o", "return_stripe_price_id": "price_1UdCJhPA71qp9sGScoAeGnWl", "public_venue": "Venue to be confirmed", "public_poster": "/images/events/dec8-2026-money-mindset-ai-skillset.png", "poster_width": 1086, "poster_height": 1448, "public_description": "A practical Tuesday evening exploring Money Mindset \u00d7 AI Skillset with Edmund Lin.", "public_content": {"heading": "A fresh week. Practical ideas to put to work.", "paragraphs": ["Join Edmund for a focused evening bringing money mindset and practical AI skills into the same conversation. Explore ways to think more clearly about money, use AI in everyday work, and turn useful ideas into small actions.", "Bring your questions and your curiosity. There will be room for conversation, examples and connecting with others. No prior AI experience is required."], "agenda": [{"time": "7:00\u20137:30 PM", "activity": "Registration"}, {"time": "7:30\u20139:30 PM", "activity": "Activity"}, {"time": "9:30\u201310:00 PM", "activity": "Post-event networking"}], "reminder": "Remember to have your dinner before coming over!"}}'::jsonb);
insert into public.event_signup_offers(event_key,event_id,amount,return_amount,currency,capacity,closes_at,enabled) values('ai-skillset-money-mindset-20261208','598a1db6-3c4a-4f81-9f3b-79fb8c1425aa',1300,800,'sgd',30,'2026-12-08T19:30:00+08:00',false);
insert into public.event_feedback_form_bindings(event_id,form_id) values('598a1db6-3c4a-4f81-9f3b-79fb8c1425aa','feedback-v4-20261119');
commit;
