-- Private owner-pilot integrations. No credentials or social content is exposed
-- through the browser Data API, including to other administrators.
create table public.social_apps (
 owner_id uuid not null references public.users(id) on delete cascade,
 provider text not null check(provider in ('instagram','linkedin')),
 encrypted_credentials text not null,
 revision uuid not null default gen_random_uuid(),
 primary key(owner_id,provider)
);
create table public.social_accounts (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.users(id) on delete cascade,
 provider text not null check(provider in ('instagram','linkedin')),
 slot smallint not null check(slot in (1,2)),
 expected_handle text check(length(expected_handle) between 1 and 64),
 account_id text,
 display_name text,
 encrypted_tokens text,
 expires_at timestamptz,
 synced_at timestamptz,
 attempted_at timestamptz,
 sync_status text not null default 'disconnected' check(sync_status in ('disconnected','connected','synced','reconnect','restricted','failed')),
 revision uuid not null default gen_random_uuid(),
 unique(owner_id,provider,slot),
 unique(owner_id,provider,account_id),
 unique(id,owner_id),
 check(provider='instagram' or slot=1),
 check((account_id is null)=(encrypted_tokens is null))
);
create table public.social_oauth_states (
 state_hash text primary key check(length(state_hash)=64),
 owner_id uuid not null references public.users(id) on delete cascade,
 account_id uuid not null,
 account_revision uuid not null,
 app_revision uuid not null,
 expires_at timestamptz not null default now()+interval '10 minutes',
 foreign key(account_id,owner_id) references public.social_accounts(id,owner_id) on delete cascade
);
create index social_oauth_expiry on public.social_oauth_states(expires_at);
create table public.social_posts (
 account_id uuid not null,
 owner_id uuid not null,
 post_id text not null check(length(post_id) between 1 and 200),
 body text not null check(length(body)<=12000),
 permalink text not null check(length(permalink)<=2000),
 published_at timestamptz not null,
 primary key(account_id,post_id),
 foreign key(account_id,owner_id) references public.social_accounts(id,owner_id) on delete cascade
);
create index social_posts_owner_date on public.social_posts(owner_id,published_at desc);
alter table public.social_apps enable row level security;
alter table public.social_accounts enable row level security;
alter table public.social_oauth_states enable row level security;
alter table public.social_posts enable row level security;
revoke all on public.social_apps,public.social_accounts,public.social_oauth_states,public.social_posts from public,anon,authenticated;
grant select,insert,update,delete on public.social_apps,public.social_accounts,public.social_oauth_states,public.social_posts to service_role;

-- A state can only be consumed once; a disconnect or new app configuration
-- invalidates every earlier authorization attempt without trusting the browser.
create function public.consume_social_oauth(p_owner uuid,p_hash text)
returns setof public.social_oauth_states language sql security invoker set search_path='' as $$
 delete from public.social_oauth_states s using public.social_accounts a,public.social_apps c
 where s.state_hash=p_hash and s.owner_id=p_owner and s.expires_at>now()
 and a.id=s.account_id and a.owner_id=p_owner and a.revision=s.account_revision
 and c.owner_id=p_owner and c.provider=a.provider and c.revision=s.app_revision
 returning s.*;
$$;

-- Lock the account for the entire commit. Disconnect/reconnect cannot resurrect
-- old tokens or cached posts when an upstream request finishes late.
create function public.commit_social_sync(p_owner uuid,p_account uuid,p_revision uuid,p_posts jsonb,p_tokens text,p_expiry timestamptz)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.social_accounts where id=p_account and owner_id=p_owner and revision=p_revision and encrypted_tokens is not null for update;
 if not found then return false; end if;
 if jsonb_typeof(p_posts)<>'array' or jsonb_array_length(p_posts)>25 then raise exception 'Invalid posts'; end if;
 delete from public.social_posts where account_id=p_account and owner_id=p_owner;
 insert into public.social_posts(account_id,owner_id,post_id,body,permalink,published_at)
 select p_account,p_owner,x.post_id,x.body,x.permalink,x.published_at
 from jsonb_to_recordset(p_posts) as x(post_id text,body text,permalink text,published_at timestamptz);
 update public.social_accounts set encrypted_tokens=p_tokens,expires_at=p_expiry,synced_at=now(),sync_status='synced'
 where id=p_account and owner_id=p_owner and revision=p_revision;
 return true;
end;
$$;
revoke all on function public.consume_social_oauth(uuid,text),public.commit_social_sync(uuid,uuid,uuid,jsonb,text,timestamptz) from public,anon,authenticated;
grant execute on function public.consume_social_oauth(uuid,text),public.commit_social_sync(uuid,uuid,uuid,jsonb,text,timestamptz) to service_role;

create function public.disconnect_social_account(p_owner uuid,p_account uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 update public.social_accounts set account_id=null,display_name=null,encrypted_tokens=null,expires_at=null,synced_at=null,attempted_at=null,sync_status='disconnected',revision=gen_random_uuid()
 where id=p_account and owner_id=p_owner;
 if not found then return false; end if;
 delete from public.social_posts where account_id=p_account and owner_id=p_owner;
 delete from public.social_oauth_states where account_id=p_account and owner_id=p_owner;
 return true;
end;
$$;
create function public.finish_social_oauth(p_owner uuid,p_account uuid,p_revision uuid,p_app_revision uuid,p_identity text,p_name text,p_tokens text,p_expiry timestamptz)
returns boolean language plpgsql security invoker set search_path='' as $$
declare v_provider text;
begin
 select provider into v_provider from public.social_accounts where id=p_account and owner_id=p_owner and revision=p_revision for update;
 if not found then return false; end if;
 perform 1 from public.social_apps where owner_id=p_owner and provider=v_provider and revision=p_app_revision for share;
 if not found then return false; end if;
 update public.social_accounts set account_id=p_identity,display_name=p_name,encrypted_tokens=p_tokens,expires_at=p_expiry,sync_status='connected',revision=gen_random_uuid(),attempted_at=null,synced_at=null
 where id=p_account and owner_id=p_owner;
 return true;
end;
$$;
revoke all on function public.disconnect_social_account(uuid,uuid),public.finish_social_oauth(uuid,uuid,uuid,uuid,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.disconnect_social_account(uuid,uuid),public.finish_social_oauth(uuid,uuid,uuid,uuid,text,text,text,timestamptz) to service_role;
