-- Member-facing product updates and private per-account acknowledgement.
create table public.member_release_notes (
 id bigint generated always as identity primary key,
 slug text not null unique check(slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
 title text not null check(length(title) between 1 and 160),
 body text not null check(length(body) between 1 and 6000),
 published_at timestamptz not null,
 published boolean not null default false
);
create index member_release_notes_published on public.member_release_notes(published_at desc,id desc) where published;
create table public.member_release_receipts (
 user_id uuid primary key references public.users(id) on delete cascade,
 release_id bigint not null references public.member_release_notes(id),
 seen_published_at timestamptz not null,
 seen_at timestamptz not null default now()
);
create index member_release_receipts_release on public.member_release_receipts(release_id);
alter table public.member_release_notes enable row level security;
alter table public.member_release_receipts enable row level security;
revoke all on public.member_release_notes, public.member_release_receipts from public, anon, authenticated;
revoke all on sequence public.member_release_notes_id_seq from public, anon, authenticated;
grant select,insert,update on public.member_release_notes, public.member_release_receipts to service_role;
grant usage,select on sequence public.member_release_notes_id_seq to service_role;

-- Server derives p_user from the verified account. A stale tab cannot rewind
-- acknowledgement of a newer release; drafts/future releases cannot be marked.
create function public.acknowledge_member_release(p_user uuid,p_release bigint)
returns void language plpgsql security invoker set search_path='' as $$
declare release_time timestamptz;
begin
 select published_at into release_time from public.member_release_notes where id=p_release and published and published_at<=now();
 if release_time is null then
  raise exception 'Release unavailable';
 end if;
 insert into public.member_release_receipts(user_id,release_id,seen_published_at) values(p_user,p_release,release_time)
 on conflict(user_id) do update set release_id=excluded.release_id,seen_published_at=excluded.seen_published_at,seen_at=now()
 where (public.member_release_receipts.seen_published_at,public.member_release_receipts.release_id)<(excluded.seen_published_at,excluded.release_id);
end;
$$;
revoke all on function public.acknowledge_member_release(uuid,bigint) from public,anon,authenticated;
grant execute on function public.acknowledge_member_release(uuid,bigint) to service_role;
