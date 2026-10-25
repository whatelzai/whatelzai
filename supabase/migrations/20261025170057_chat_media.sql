create table public.member_ai_images (
 id uuid primary key,
 user_id uuid not null references public.users(id),
 conversation_id uuid not null,
 request_id uuid,
 created_at timestamptz not null default now(),
 foreign key(conversation_id,user_id) references public.member_ai_conversations(id,user_id),
 foreign key(request_id,user_id,conversation_id) references public.member_ai_requests(id,user_id,conversation_id)
);
create index member_ai_images_owner on public.member_ai_images(user_id,created_at);
alter table public.member_ai_images enable row level security;
revoke all on public.member_ai_images from public,anon,authenticated;
grant select,insert,update,delete on public.member_ai_images to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('chat-images','chat-images',false,262144,array['image/webp']);
-- No browser storage policies. All reads check immutable signed-in ownership.
create function public.register_member_image(p_user uuid,p_conversation uuid,p_id uuid)
returns void language plpgsql security invoker set search_path='' as $$
begin
 perform public.ensure_activated_member_ai(p_user);
 perform 1 from public.member_ai_access where user_id=p_user for update;
 if not exists(select 1 from public.member_ai_conversations where id=p_conversation and user_id=p_user) then raise exception 'Conversation unavailable'; end if;
 if (select count(*) from public.member_ai_images where user_id=p_user and created_at>now()-interval '1 day')>=40
 or (select count(*) from public.member_ai_images where user_id=p_user and request_id is null and created_at>now()-interval '1 day')>=10 then raise exception 'Image upload limit reached'; end if;
 insert into public.member_ai_images(id,user_id,conversation_id) values(p_id,p_user,p_conversation);
end $$;

create function public.reserve_member_ai_images(p_user uuid,p_request uuid,p_conversation uuid,p_text text,p_reserve bigint,p_model text,p_images uuid[])
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb; attached uuid[]; n integer;
begin
 if p_images is null or cardinality(p_images)>2 or array_position(p_images,null) is not null
 or cardinality(p_images)<>(select count(distinct x) from unnest(p_images) x) then raise exception 'Invalid images'; end if;
 result:=public.reserve_member_ai(p_user,p_request,p_conversation,p_text,p_reserve,p_model);
 -- The account lock held by reserve serializes request/image binding.
 select coalesce(array_agg(id order by id),'{}'::uuid[]) into attached from public.member_ai_images where request_id=p_request and user_id=p_user;
 if coalesce((result->>'duplicate')::boolean,false) then
  if attached is distinct from array(select x from unnest(p_images) x order by x) then raise exception 'Request images changed'; end if;
  return result;
 end if;
 perform 1 from public.member_ai_images where id=any(p_images) order by id for update;
 select count(*) into n from public.member_ai_images where id=any(p_images) and user_id=p_user and conversation_id=p_conversation and request_id is null;
 if n<>cardinality(p_images) then raise exception 'Image unavailable'; end if;
 update public.member_ai_images set request_id=p_request where id=any(p_images) and user_id=p_user;
 return result;
end $$;

create table public.member_ai_dictations (
 id uuid primary key,
 user_id uuid not null references public.member_ai_access(user_id),
 cycle_id uuid not null,
 audio_hash text not null check(length(audio_hash)=64),
 reserved_micro bigint not null check(reserved_micro between 1 and 4500),
 status text not null default 'running' check(status in ('running','completed','failed','uncertain')),
 transcript text not null default '' check(length(transcript)<=12000),
 created_at timestamptz not null default now(),
 foreign key(cycle_id,user_id) references public.member_ai_cycles(id,user_id)
);
create index member_ai_dictations_owner on public.member_ai_dictations(user_id,created_at);
alter table public.member_ai_dictations enable row level security;
revoke all on public.member_ai_dictations from public,anon,authenticated;
grant select,insert,update on public.member_ai_dictations to service_role;
create function public.reserve_member_dictation(p_user uuid,p_id uuid,p_hash text,p_samples integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare a public.member_ai_access; c public.member_ai_cycles; d public.member_ai_dictations; cutoff timestamptz; cost bigint;
begin
 if p_samples not between 1600 and 960000 or p_hash is null or p_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid recording'; end if;
 perform public.ensure_activated_member_ai(p_user);
 select * into a from public.member_ai_access where user_id=p_user for update;
 select * into d from public.member_ai_dictations where id=p_id;
 if found then
  if d.user_id<>p_user or d.audio_hash<>p_hash then raise exception 'Recording unavailable'; end if;
  return jsonb_build_object('duplicate',true,'status',d.status,'text',case when d.status='completed' then d.transcript else '' end);
 end if;
 if (select count(*) from public.member_ai_dictations where user_id=p_user and created_at>now()-interval '1 hour')>=30 then raise exception 'Hourly dictation limit reached'; end if;
 if exists(select 1 from public.member_ai_dictations where user_id=p_user and status='running' and created_at>now()-interval '5 minutes') then raise exception 'A recording is being transcribed'; end if;
 select * into c from public.member_ai_cycles where id=a.current_cycle_id and user_id=p_user;
 if not found or c.ends_at<=now() then
  cutoff:=case when c.id is null then now()+interval '7 days' else c.ends_at+(floor(extract(epoch from(now()-c.ends_at))/604800)::bigint+1)*interval '7 days' end;
  insert into public.member_ai_cycles(user_id,allowance_micro,started_at,ends_at,reason) values(p_user,a.allowance_micro,cutoff-interval '7 days',cutoff,'weekly') returning * into c;
  update public.member_ai_access set current_cycle_id=c.id where user_id=p_user;
 end if;
 -- GPT-Transcribe: USD0.0045/minute. WAV samples are server-validated 16kHz mono.
 cost:=ceil(p_samples::numeric*4500/960000);
 if c.spent_micro+c.reserved_micro+cost>c.allowance_micro then raise exception 'AI allowance reached'; end if;
 update public.member_ai_cycles set reserved_micro=reserved_micro+cost where id=c.id;
 insert into public.member_ai_dictations(id,user_id,cycle_id,audio_hash,reserved_micro) values(p_id,p_user,c.id,p_hash,cost);
 return jsonb_build_object('duplicate',false);
end $$;
create function public.finish_member_dictation(p_user uuid,p_id uuid,p_text text,p_failed boolean,p_uncertain boolean)
returns void language plpgsql security invoker set search_path='' as $$
declare d public.member_ai_dictations;
begin
 select * into d from public.member_ai_dictations where id=p_id and user_id=p_user for update;
 if not found then raise exception 'Recording unavailable'; end if;
 if d.status<>'running' then return; end if;
 if p_text is null or length(p_text)>12000 then raise exception 'Invalid transcript'; end if;
 if not p_uncertain then
  update public.member_ai_cycles set reserved_micro=reserved_micro-d.reserved_micro,spent_micro=spent_micro+case when p_failed then 0 else d.reserved_micro end where id=d.cycle_id and user_id=p_user;
 end if;
 update public.member_ai_dictations set status=case when p_uncertain then 'uncertain' when p_failed then 'failed' else 'completed' end,transcript=case when p_failed then '' else p_text end where id=p_id;
end $$;
revoke all on function public.register_member_image(uuid,uuid,uuid),public.reserve_member_ai_images(uuid,uuid,uuid,text,bigint,text,uuid[]),public.reserve_member_dictation(uuid,uuid,text,integer),public.finish_member_dictation(uuid,uuid,text,boolean,boolean) from public,anon,authenticated;
grant execute on function public.register_member_image(uuid,uuid,uuid),public.reserve_member_ai_images(uuid,uuid,uuid,text,bigint,text,uuid[]),public.reserve_member_dictation(uuid,uuid,text,integer),public.finish_member_dictation(uuid,uuid,text,boolean,boolean) to service_role;
