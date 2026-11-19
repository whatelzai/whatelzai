begin;
-- Server-only ticket storage. Additive; rollback: remove new routes first,
-- then archive this table (do not drop paid attendee records).
create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_key text not null,
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text,
  attendee_name text not null,
  email text not null,
  phone text not null,
  status text not null default 'confirmed' check (status in ('confirmed','cancelled')),
  email_sent_at timestamptz,
  checked_in_at timestamptz,
  checked_in_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  constraint checkin_actor check ((checked_in_at is null) = (checked_in_by is null))
);
create index event_registrations_event_key_idx on public.event_registrations(event_key, created_at);
create index event_registrations_payment_idx on public.event_registrations(stripe_payment_intent_id) where stripe_payment_intent_id is not null;
alter table public.event_registrations enable row level security;
revoke all on public.event_registrations from public, anon, authenticated;
grant select, insert, update on public.event_registrations to service_role;

-- Event-scoped staff; owner approves membership via the server-only admin action.
create table public.event_staff (
 event_key text not null,
 user_id uuid not null references public.users(id),
 granted_by uuid not null references public.users(id),
 created_at timestamptz not null default now(),
 primary key(event_key,user_id)
);
alter table public.event_staff enable row level security;
revoke all on public.event_staff from public,anon,authenticated;
grant select,insert,delete on public.event_staff to service_role;

-- Records full refunds even when refund delivery precedes checkout delivery.
create table public.event_refund_ledger (
 stripe_payment_intent_id text primary key,
 refunded_at timestamptz not null default now()
);
alter table public.event_refund_ledger enable row level security;
revoke all on public.event_refund_ledger from public,anon,authenticated;
grant select,insert on public.event_refund_ledger to service_role;

commit;
