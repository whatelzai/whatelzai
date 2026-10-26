-- Business reference content is data, not a deployment artifact.
create table public.member_knowledge_collections (
 id text primary key check(length(id) between 1 and 80),
 kind text not null check(kind in ('culture','product-class','pipeline','marketing-plan')),
 title text not null check(length(title) between 1 and 300),
 metadata jsonb not null default '{}' check(jsonb_typeof(metadata)='object' and octet_length(metadata::text)<=131072),
 provenance jsonb not null default '{}' check(jsonb_typeof(provenance)='object' and octet_length(provenance::text)<=2097152),
 position integer not null default 0,
 published boolean not null default false,
 updated_at timestamptz not null default now()
);
create table public.member_knowledge_entries (
 id text primary key check(length(id) between 1 and 120),
 collection_id text not null references public.member_knowledge_collections(id),
 title text not null default '' check(length(title)<=300),
 body text not null check(length(body) between 1 and 100000),
 metadata jsonb not null default '{}' check(jsonb_typeof(metadata)='object' and octet_length(metadata::text)<=65536),
 position integer not null default 0,
 published boolean not null default false,
 updated_at timestamptz not null default now()
);
create index member_knowledge_entries_collection on public.member_knowledge_entries(collection_id,position,id) where published;
alter table public.member_knowledge_collections enable row level security;
alter table public.member_knowledge_entries enable row level security;
revoke all on public.member_knowledge_collections, public.member_knowledge_entries from public,anon,authenticated;
grant select,insert,update on public.member_knowledge_collections,public.member_knowledge_entries to service_role;
-- Shared references only. Private member records never move into these tables.
-- Prose remains text; new variable attributes use bounded JSONB, without changing ownership.
alter table public.member_leads add column metadata jsonb not null default '{}' check(jsonb_typeof(metadata)='object' and octet_length(metadata::text)<=32768);
alter table public.member_briefings add column metadata jsonb not null default '{}' check(jsonb_typeof(metadata)='object' and octet_length(metadata::text)<=32768);

-- Atomic content ingestion; callable only from trusted server/admin tooling.
-- Inserts only: collisions fail instead of overwriting later editorial changes.
create function public.import_member_knowledge(p_collections jsonb,p_entries jsonb)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if jsonb_typeof(p_collections) is distinct from 'array' or jsonb_typeof(p_entries) is distinct from 'array'
 or jsonb_array_length(p_collections) not between 1 and 100 or jsonb_array_length(p_entries)>1000
 or octet_length(p_collections::text)+octet_length(p_entries::text)>4194304 then raise exception 'Invalid knowledge import'; end if;
 insert into public.member_knowledge_collections(id,kind,title,metadata,provenance,position,published)
 select id,kind,title,coalesce(metadata,'{}'::jsonb),coalesce(provenance,'{}'::jsonb),coalesce(position,0),coalesce(published,false)
 from jsonb_to_recordset(p_collections) as x(id text,kind text,title text,metadata jsonb,provenance jsonb,position integer,published boolean);
 insert into public.member_knowledge_entries(id,collection_id,title,body,metadata,position,published)
 select id,collection_id,coalesce(title,''),body,coalesce(metadata,'{}'::jsonb),coalesce(position,0),coalesce(published,false)
 from jsonb_to_recordset(p_entries) as x(id text,collection_id text,title text,body text,metadata jsonb,position integer,published boolean);
end $$;
revoke all on function public.import_member_knowledge(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.import_member_knowledge(jsonb,jsonb) to service_role;
