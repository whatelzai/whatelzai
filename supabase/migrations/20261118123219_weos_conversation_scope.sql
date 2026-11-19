-- Keep previously authorized business context out of a later Ember session.
create function weos_private.role_for_user(p_user uuid) returns text language sql stable security definer set search_path='' as $$
 select coalesce((select case
  when m.role_code='beacon' and u.role='superadmin' then 'beacon'
  when m.role_code='blaze' then 'blaze'
  when m.role_code='torch' and p.abo_status='ABO' then 'torch'
  when m.role_code in ('torch','ember') then 'ember'
  else 'guest' end
 from public.users u join public.business_team_accounts a on a.user_id=u.id
 join public.business_team_people p on p.id=a.person_id and p.team_id=a.team_id
 join public.weos_community_memberships m on m.person_id=p.id and m.team_id=p.team_id and m.status='active'
 join public.weos_communities c on c.id=m.community_id and c.team_id=m.team_id and c.slug='whatelz'
 where u.id=p_user
 order by (m.role_code='beacon') desc limit 1),'guest');
$$;

revoke all on function weos_private.role_for_user(uuid) from public,anon,authenticated,service_role;
create or replace function weos_private.role() returns text language sql stable security definer set search_path='' as $$
 select weos_private.role_for_user(weos_private.actor());
$$;
alter table public.member_ai_conversations add column context_scope text not null default 'business' check(context_scope in ('business','learning'));
create function weos_private.conversation_scope() returns trigger language plpgsql security definer set search_path='' as $$
begin
 new.context_scope:=case when weos_private.role_for_user(new.user_id)='ember' then 'learning' else 'business' end;
 return new;
end;
$$;
create trigger weos_conversation_scope before insert on public.member_ai_conversations for each row execute function weos_private.conversation_scope();
create function weos_private.message_scope() returns trigger language plpgsql security definer set search_path='' as $$
declare r text; scope text;
begin
 -- Finish/audit an already authorized provider request even if access was
 -- revoked mid-stream. RLS still hides the result from a now-Guest account.
 if new.role<>'user' then return new; end if;
 r:=weos_private.role_for_user(new.user_id);
 if r='guest' then raise insufficient_privilege using message='Member access required'; end if;
 select context_scope into scope from public.member_ai_conversations where id=new.conversation_id and user_id=new.user_id for update;
 if scope is null then raise insufficient_privilege using message='Conversation unavailable'; end if;
 if r='ember' and scope<>'learning' then raise insufficient_privilege using message='Start a new learning conversation'; end if;
 if r in ('beacon','blaze','torch') and scope='learning' then
  update public.member_ai_conversations set context_scope='business' where id=new.conversation_id and user_id=new.user_id;
 end if;
 return new;
end;
$$;
create trigger weos_message_scope before insert on public.member_ai_messages for each row execute function weos_private.message_scope();
revoke all on function weos_private.conversation_scope(),weos_private.message_scope() from public,anon,authenticated,service_role;
drop policy weos_conversation_read on public.member_ai_conversations;
create policy weos_conversation_read on public.member_ai_conversations for select to authenticated using(
 weos_private.role()='beacon' or (user_id=weos_private.actor() and (weos_private.role() in ('blaze','torch') or (weos_private.role()='ember' and context_scope='learning')))
);
drop policy weos_message_read on public.member_ai_messages;
create policy weos_message_read on public.member_ai_messages for select to authenticated using(
 weos_private.role()='beacon' or (user_id=weos_private.actor() and (weos_private.role() in ('blaze','torch') or (weos_private.role()='ember' and exists(select 1 from public.member_ai_conversations c where c.id=member_ai_messages.conversation_id and c.user_id=member_ai_messages.user_id and c.context_scope='learning'))))
);
