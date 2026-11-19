-- Push capability URLs and encryption keys are server-only, encrypted at rest.
create table public.admin_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  endpoint_hash text not null check(length(endpoint_hash)=64),
  encrypted_subscription text not null,
  enabled boolean not null default true,
  enabled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_success_at timestamptz,
  last_error_code text,
  last_test_at timestamptz,
  unique(owner_id,endpoint_hash)
);
create index admin_push_enabled on public.admin_push_subscriptions(owner_id) where enabled;
create table public.admin_push_deliveries (
  subscription_id uuid not null references public.admin_push_subscriptions(id) on delete cascade,
  document_path text not null,
  source_hash text not null,
  status text not null check(status in ('sending','sent','failed')),
  attempts integer not null default 1 check(attempts between 1 and 3),
  attempted_at timestamptz not null default now(),
  sent_at timestamptz,
  primary key(subscription_id,document_path)
);
create table public.admin_push_state (
  owner_id uuid primary key references public.users(id) on delete cascade,
  checked_at timestamptz not null default now(),
  error_code text
);
alter table public.admin_push_subscriptions enable row level security;
alter table public.admin_push_deliveries enable row level security;
alter table public.admin_push_state enable row level security;
revoke all on public.admin_push_subscriptions, public.admin_push_deliveries, public.admin_push_state from public,anon,authenticated;
grant select,insert,update,delete on public.admin_push_subscriptions, public.admin_push_deliveries, public.admin_push_state to service_role;

create function public.claim_admin_push(p_subscription uuid,p_document text,p_hash text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare claimed uuid;
begin
  -- Row-level conflict locking prevents concurrent cron runs claiming a delivery.
  insert into public.admin_push_deliveries(subscription_id,document_path,source_hash,status)
  select s.id,p_document,p_hash,'sending' from public.admin_push_subscriptions s where s.id=p_subscription and s.enabled
  on conflict(subscription_id,document_path) do update
    set status='sending',attempts=admin_push_deliveries.attempts+1,attempted_at=now(),source_hash=excluded.source_hash
    where admin_push_deliveries.status<>'sent' and admin_push_deliveries.attempts<3
      and admin_push_deliveries.attempted_at<now()-interval '10 minutes'
  returning subscription_id into claimed;
  return claimed is not null;
end $$;
revoke all on function public.claim_admin_push(uuid,text,text) from public,anon,authenticated;
grant execute on function public.claim_admin_push(uuid,text,text) to service_role;
