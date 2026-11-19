create table public.event_feedback (
 id uuid primary key,
 event_id uuid not null references public.events(id),
 rating smallint not null check(rating between 1 and 5),
 comment text not null default '' check(char_length(comment)<=1500),
 client_hash text not null check(client_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now()
);
create index event_feedback_event_created on public.event_feedback(event_id,created_at desc);
create index event_feedback_client_created on public.event_feedback(client_hash,created_at desc);
alter table public.event_feedback enable row level security;
revoke all on public.event_feedback from public,anon,authenticated;
grant select,insert,delete on public.event_feedback to service_role;
create function public.submit_event_feedback(p_id uuid,p_event uuid,p_rating integer,p_comment text,p_client_hash text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare prior public.event_feedback;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_client_hash,0));
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,1));
 select * into prior from public.event_feedback where id=p_id;
 if found then
  if prior.event_id<>p_event or prior.rating<>p_rating or prior.comment<>p_comment then raise exception 'FEEDBACK_CONFLICT'; end if;
  return true;
 end if;
 if (select count(*) from public.event_feedback where client_hash=p_client_hash and created_at>now()-interval '1 hour')>=20 then raise exception 'FEEDBACK_RATE_LIMIT'; end if;
 insert into public.event_feedback(id,event_id,rating,comment,client_hash) values(p_id,p_event,p_rating,p_comment,p_client_hash);
 return true;
end;
$$;
revoke all on function public.submit_event_feedback(uuid,uuid,integer,text,text) from public,anon,authenticated;
grant execute on function public.submit_event_feedback(uuid,uuid,integer,text,text) to service_role;
