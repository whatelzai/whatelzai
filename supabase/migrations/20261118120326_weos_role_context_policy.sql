-- App context is read through the member JWT, never a service-role AI query.
-- Existing private base-table grants remain denied. This RPC intentionally uses
-- a tightly scoped definer in a non-exposed schema to project allowed fields;
-- it derives identity from auth.uid(), accepts no actor/role and rechecks scope.
create schema if not exists weos_private;
revoke all on schema weos_private from public,anon;
grant usage on schema weos_private to authenticated;
create function weos_private.actor() returns uuid language sql stable security definer set search_path='' as $$
 select id from public.users where supabase_auth_user_id=auth.uid();
$$;
create function weos_private.role() returns text language sql stable security definer set search_path='' as $$
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
 where u.supabase_auth_user_id=auth.uid()
 order by (m.role_code='beacon') desc limit 1),'guest');
$$;
create function weos_private.lead_allowed(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select weos_private.role()='beacon' or (weos_private.role() in ('blaze','torch') and public.can_read_member_lead(weos_private.actor(),p_id));
$$;
create function weos_private.note_allowed(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select weos_private.role()='beacon' or (weos_private.role() in ('blaze','torch') and public.can_read_member_briefing(weos_private.actor(),p_id));
$$;
-- General AI knowledge is a separate data category, not business knowledge
-- made available by changing a prompt. Publishing remains owner-controlled.
alter table public.member_knowledge_collections drop constraint member_knowledge_collections_kind_check;
alter table public.member_knowledge_collections add constraint member_knowledge_collections_kind_check check(kind in ('culture','product-class','pipeline','marketing-plan','ai-learning'));
create function weos_private.collection_allowed(p_id text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.member_knowledge_collections c where c.id=p_id and c.published
 and (weos_private.role() in ('beacon','blaze','torch') or (weos_private.role()='ember' and c.kind='ai-learning')));
$$;
-- Real RLS for authenticated knowledge reads and private-chat oversight.
-- No anonymous reads, writes, credentials or billing-table grants are added.
grant select(id,kind,title,position,published,updated_at) on public.member_knowledge_collections to authenticated;
grant select(id,collection_id,title,body,position,published,updated_at) on public.member_knowledge_entries to authenticated;
create policy weos_collection_read on public.member_knowledge_collections for select to authenticated using(weos_private.collection_allowed(id));
create policy weos_entry_read on public.member_knowledge_entries for select to authenticated using(published and weos_private.collection_allowed(collection_id));
grant select on public.member_ai_conversations,public.member_ai_messages to authenticated;
create policy weos_conversation_read on public.member_ai_conversations for select to authenticated using(weos_private.role()<>'guest' and (user_id=weos_private.actor() or weos_private.role()='beacon'));
create policy weos_message_read on public.member_ai_messages for select to authenticated using(weos_private.role()<>'guest' and (user_id=weos_private.actor() or weos_private.role()='beacon'));

create function weos_private.context_read(p_source text,p_query text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r text:=weos_private.role(); actor uuid:=weos_private.actor(); q text:=btrim(coalesce(p_query,'')); result jsonb; profile jsonb; target uuid; persona text; records jsonb; public_events jsonb;
begin
 if actor is null or r='guest' then raise insufficient_privilege using message='Member access required'; end if;
 if char_length(q)>1100 then raise exception 'Query too long'; end if;
 if r='ember' and p_source not in ('learning','events') then raise insufficient_privilege using message='Context source unavailable for Ember'; end if;
 if p_source in ('leads','hqh') then
  select coalesce(jsonb_agg(x),'[]') into result from (
   select l.id,l.name,l.membership,l.relationship,left(l.story,1200) story,left(l.interests,1000) interests,left(l.concerns,1000) concerns,l.next_action,l.follow_up_on,
    case when l.owner_id=actor then 'own' else 'permitted community' end access,
    '/leads/'||l.id::text url
   from public.member_leads l where weos_private.lead_allowed(l.id) and (q='' or position(lower(q) in lower(l.name))>0)
   order by (lower(l.name)=lower(q)) desc,l.name,l.id limit 5
  ) x;
  if p_source='leads' then return jsonb_build_object('items',result,'coverage','Up to five database-authorized profiles; contact details and private remarks are excluded.'); end if;
  select x into profile from jsonb_array_elements(result) x where lower(x->>'name')=lower(q) limit 1;
  if profile is null and jsonb_array_length(result)=1 then profile:=result->0; end if;
  if profile is null then return jsonb_build_object('items','[]'::jsonb,'coverage','Name ambiguous or unavailable; specify the full name. Hidden profiles stay unavailable.'); end if;
  target:=(profile->>'id')::uuid;
  select jsonb_build_object('person',profile,'metadata',coalesce((select jsonb_object_agg(key,value) from jsonb_each(l.metadata) where key in ('hqh_intakes','hqh_context_captures','poti_status','poti_status_reported_on','social_comfort','amway_connection_awareness','intro_gather_readiness','intro_gather_logistics')),'{}'),
   'followups',coalesce((select jsonb_agg(x) from (select n.id,n.title,n.kind,n.status,n.occurred_on,n.updated_at,n.observations,n.reflections,n.next_steps from public.member_briefings n where target=any(n.lead_ids) and weos_private.note_allowed(n.id) order by n.updated_at desc,n.id limit 20)x),'[]'),
   'activities',coalesce((select jsonb_agg(x) from (select a.title,a.activity_on,a.status,left(a.notes,180) notes from public.member_lead_activities a where a.lead_id=target order by a.activity_on desc,a.id limit 8)x),'[]'),
   'format',(select body from public.member_knowledge_entries where id='weos-hqh-whatsapp-format-v1' and published)) into result from public.member_leads l where l.id=target;
  return result;
 elsif p_source='hqh_discover' then
  return jsonb_build_object('people',coalesce((select jsonb_agg(x) from(select l.id,l.name from public.member_leads l where weos_private.lead_allowed(l.id) order by l.name,l.id limit 500)x),'[]'),
   'notes',coalesce((select jsonb_agg(x) from(select n.event_name,n.occurred_on,n.lead_ids from public.member_briefings n where n.owner_id=actor and n.kind='HQH' and n.occurred_on between (now() at time zone 'Asia/Singapore')::date-7 and (now() at time zone 'Asia/Singapore')::date+60 order by n.updated_at desc,n.id limit 100)x),'[]'));
 elsif p_source='commitments' then
  select coalesce(jsonb_agg(x),'[]') into result from(select t.title,t.lane,t.due_on,t.status from public.daily_tasks t where t.owner_id=actor and t.status not in ('done','dropped') order by t.due_on,t.id limit 20)x;
  return jsonb_build_object('items',result,'coverage','Earliest twenty own unfinished commitments; no automatic acceptance or completion.');
 elsif p_source='briefings' then
  select coalesce(jsonb_agg(x),'[]') into result from(select n.id,n.title,n.kind,n.status,n.event_name,left(n.observations,900) observations,left(n.reflections,900) reflections,left(n.next_steps,600) next_steps,'/briefings/'||n.id::text url from public.member_briefings n where weos_private.note_allowed(n.id) and (q='' or position(lower(q) in lower(n.title))>0) order by n.updated_at desc,n.id limit 3)x;
  return jsonb_build_object('items',result,'coverage','Latest three database-authorized title matches.');
 elsif p_source in ('culture','learning') then
  select coalesce(jsonb_agg(x),'[]') into result from(select e.id,e.title,left(e.body,1800) text,c.title collection from public.member_knowledge_entries e join public.member_knowledge_collections c on c.id=e.collection_id where e.published and weos_private.collection_allowed(c.id) and c.kind=case when p_source='learning' then 'ai-learning' else 'culture' end and (q='' or position(lower(q) in lower(e.body||' '||e.title||' '||c.title))>0) order by e.position,e.id limit 6)x;
  return jsonb_build_object('items',result,'coverage','Up to six published role-authorized learning/reference snippets. Empty means no matching published material.');
 elsif p_source='products' then
  select coalesce(jsonb_agg(x),'[]') into result from(select l.source_id,l.sku,l.name,l.brand,l.category,l.pack,l.pv,l.pv_max,l.pv_status,l.bv,l.bv_max,l.bv_status,l.ap,l.ap_max,l.ap_status,l.rp,l.rp_max,l.rp_status,s.market,s.currency,s.edition_date,s.source_url from public.product_catalogue_listings l join public.product_catalogue_sources s on s.id=l.source_id where s.id in(select distinct on(market) id from public.product_catalogue_sources order by market,edition_date desc,id) and (q='' or position(lower(q) in lower(l.name||' '||l.sku))>0) order by l.name,l.source_id limit 6)x;
  return jsonb_build_object('items',result,'coverage','Published catalogue snapshot, up to six matches. No live stock, checkout or inferred PV/BV.');
 elsif p_source='communities' then
  select coalesce(jsonb_agg(x),'[]') into result from(select c.name community,m.role_code,m.status,coalesce(p.display_name,l.name) name from public.weos_community_memberships m join public.weos_communities c on c.id=m.community_id left join public.business_team_people p on p.id=m.person_id left join public.member_leads l on l.id=m.lead_id where m.status='active' and (r='beacon' or exists(select 1 from public.business_team_accounts a where a.user_id=actor and a.team_id=m.team_id)) and (m.lead_id is null or weos_private.lead_allowed(m.lead_id)) and (q='' or position(lower(q) in lower(coalesce(p.display_name,l.name,'')))>0) order by c.name,coalesce(p.display_name,l.name) limit 20)x;
  return jsonb_build_object('items',result,'coverage','Community roles are separate from sponsor placement. No contact details or private chat context.');
 elsif p_source='social' then
  if r<>'beacon' then raise insufficient_privilege using message='Owner social context only'; end if;
  select coalesce(jsonb_agg(x),'[]') into result from(select p.body,p.permalink,p.published_at from public.social_posts p where p.owner_id=actor and (q='' or position(lower(q) in lower(p.body))>0) order by p.published_at desc limit 6)x;
  return jsonb_build_object('items',result,'coverage','Cached own posts only; no credentials, DMs, follower profiles or live web access.');
 elsif p_source='events' then
  select coalesce(jsonb_agg(x),'[]') into public_events from(select e.id,e.name title,e.date,e.location,left(e.metadata->>'description',1200) description from public.events e where e.published and e.type in ('training','workshop','talk') and coalesce(e.metadata->>'visibility','listed')<>'unlisted' and coalesce(e.metadata->>'status','')<>'cancelled' order by e.date limit 100)x;
  if r='beacon' then persona:='Admin'; else
   select case m.role_code when 'oracle' then 'Oracle' when 'architect' then 'Architect' when 'catalyst' then 'Catalyst' when 'spark' then 'Spark' else 'Guest' end into persona from public.weos_community_memberships m join public.weos_communities c on c.id=m.community_id join public.business_team_accounts a on a.person_id=m.person_id and a.team_id=m.team_id where a.user_id=actor and c.slug='founders-club' and m.status='active' limit 1;
   persona:=coalesce(persona,'Guest');
  end if;
  select coalesce(jsonb_agg(x),'[]') into records from(select t.id,t.uid,t.recurrence_id,t.sequence,t.revision_at,t.message_id,t.received_at,t.ics from public.community_calendar_records t where t.import_id=(select id from public.community_calendar_imports order by imported_at desc limit 1) and (persona='Admin' or substring(replace(t.ics,E'\r','') from E'(?m)^SUMMARY:([^\n]*)') ~* '^(badminton|captain ball)$' or (persona in ('Oracle','Architect','Catalyst') and substring(replace(t.ics,E'\r','') from E'(?m)^SUMMARY:([^\n]*)') ~* '^(founders?[''’]? (intro|gather|collab)|monday opp class|wednesday soonye leadership class|shopping tour|hq tour|hqh( for .*)?)$')) order by t.id limit 1000)x;
  return jsonb_build_object('public_events',public_events,'records',records,'persona',persona,'coverage','Published Whatelz events and database-authorized FC records; occurrence expansion is bounded server-side. No attendance or booking claim.');
 end if;
 raise exception 'Unknown context source';
end;
$$;
create function public.weos_read_context(p_source text,p_query text default '') returns jsonb language sql stable security invoker set search_path='' as $$
 select weos_private.context_read(p_source,p_query);
$$;
revoke all on function weos_private.actor(),weos_private.role(),weos_private.lead_allowed(uuid),weos_private.note_allowed(uuid),weos_private.collection_allowed(text),weos_private.context_read(text,text) from public,anon;
grant execute on function weos_private.actor(),weos_private.role(),weos_private.lead_allowed(uuid),weos_private.note_allowed(uuid),weos_private.collection_allowed(text),weos_private.context_read(text,text) to authenticated;
revoke all on function public.weos_read_context(text,text) from public,anon,service_role;
grant execute on function public.weos_read_context(text,text) to authenticated;
