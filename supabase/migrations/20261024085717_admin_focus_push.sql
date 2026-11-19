-- Device-local timetable mirror for delivery while the PWA is closed.
-- Existing private-table grants and RLS remain unchanged.
alter table public.admin_push_subscriptions
  add column focus_settings jsonb,
  add column focus_hash text check(focus_hash is null or length(focus_hash)=64),
  add column focus_updated_at timestamptz not null default now();
