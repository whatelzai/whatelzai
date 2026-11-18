-- Beacon can lower context privileges for one SQL call; no identity changes.
create or replace function weos_private.role() returns text language sql stable security definer set search_path='' as $$
 select case when weos_private.role_for_user(weos_private.actor())='beacon'
 and current_setting('weos.preview_role',true) in ('blaze','torch','ember')
 then current_setting('weos.preview_role',true)
 else weos_private.role_for_user(weos_private.actor()) end;
$$;
create function weos_private.preview_context(p_role text,p_source text,p_query text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; previous text:=coalesce(current_setting('weos.preview_role',true),'');
begin
 if weos_private.role_for_user(weos_private.actor())<>'beacon' or p_role is null or p_role not in ('blaze','torch','ember') then
  raise insufficient_privilege using message='Beacon role test required';
 end if;
 -- No owner-private workspaces or connected vault enter a role test.
 if p_source in ('commitments','social') then return jsonb_build_object('unavailable',true,'reason','Private owner context is excluded from role tests.'); end if;
 perform set_config('weos.preview_role',p_role,true);
 result:=weos_private.context_read(p_source,p_query);
 perform set_config('weos.preview_role',previous,true);
 return result;
exception when others then
 perform set_config('weos.preview_role',previous,true);
 raise;
end;
$$;
create function public.weos_preview_context(p_role text,p_source text,p_query text) returns jsonb language sql security invoker set search_path='' as $$
 select weos_private.preview_context(p_role,p_source,p_query);
$$;
revoke all on function weos_private.preview_context(text,text,text),public.weos_preview_context(text,text,text) from public,anon,service_role;
grant execute on function weos_private.preview_context(text,text,text),public.weos_preview_context(text,text,text) to authenticated;

alter table public.member_ai_conversations add column preview_role text check(preview_role in ('blaze','torch','ember'));
-- A dedicated, atomic reservation labels test chats before a message can exist.
create function weos_private.reserve_preview(p_user uuid,p_request uuid,p_conversation uuid,p_role text,p_text text,p_reserve bigint,p_model text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if weos_private.role_for_user(p_user)<>'beacon' or p_role is null or p_role not in ('blaze','torch','ember') then raise insufficient_privilege using message='Beacon role test required'; end if;
 insert into public.member_ai_conversations(id,user_id,title,preview_role) values(p_conversation,p_user,'Role test · '||p_role,p_role) on conflict(id) do nothing;
 if not exists(select 1 from public.member_ai_conversations where id=p_conversation and user_id=p_user and preview_role=p_role) then raise insufficient_privilege using message='Role test conversation unavailable'; end if;
 return public.reserve_member_ai(p_user,p_request,p_conversation,p_text,p_reserve,p_model);
end;
$$;
create function public.reserve_weos_preview(p_user uuid,p_request uuid,p_conversation uuid,p_role text,p_text text,p_reserve bigint,p_model text)
returns jsonb language sql security invoker set search_path='' as $$
 select weos_private.reserve_preview(p_user,p_request,p_conversation,p_role,p_text,p_reserve,p_model);
$$;
revoke all on function weos_private.reserve_preview(uuid,uuid,uuid,text,text,bigint,text),public.reserve_weos_preview(uuid,uuid,uuid,text,text,bigint,text) from public,anon,authenticated;
grant usage on schema weos_private to service_role;
grant execute on function weos_private.reserve_preview(uuid,uuid,uuid,text,text,bigint,text),public.reserve_weos_preview(uuid,uuid,uuid,text,text,bigint,text) to service_role;

-- Ember event context cannot inherit a Beacon test actor’s FC business audience.
create or replace function weos_private.context_read(p_source text,p_query text) returns jsonb language plpgsql stable security definer set search_path='' as $$
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
  if (select count(*) from jsonb_array_elements(result) x where lower(x->>'name')=lower(q))=1 then
   select x into profile from jsonb_array_elements(result) x where lower(x->>'name')=lower(q);
  end if;
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
  if r='ember' and persona in ('Admin','Oracle','Architect','Catalyst') then persona:='Spark'; end if;
  select coalesce(jsonb_agg(x),'[]') into records from(select t.id,t.uid,t.recurrence_id,t.sequence,t.revision_at,t.message_id,t.received_at,t.ics from public.community_calendar_records t where t.import_id=(select id from public.community_calendar_imports order by imported_at desc limit 1) and (persona='Admin' or substring(replace(t.ics,E'\r','') from E'(?m)^SUMMARY:([^\n]*)') ~* '^(badminton|captain ball)$' or (persona in ('Oracle','Architect','Catalyst') and substring(replace(t.ics,E'\r','') from E'(?m)^SUMMARY:([^\n]*)') ~* '^(founders?[''’]? (intro|gather|collab)|monday opp class|wednesday soonye leadership class|shopping tour|hq tour|hqh( for .*)?)$')) order by t.id limit 1000)x;
  return jsonb_build_object('public_events',public_events,'records',records,'persona',persona,'coverage','Published Whatelz events and database-authorized FC records; occurrence expansion is bounded server-side. No attendance or booking claim.');
 end if;
 raise exception 'Unknown context source';
end;
$$;
