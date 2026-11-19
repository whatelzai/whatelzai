-- Match the precision used by browser dates and pagination cursors. These
-- new tables are still empty when this follow-up is applied.
alter table public.member_release_notes alter column published_at type timestamptz(3);
alter table public.member_release_receipts alter column seen_published_at type timestamptz(3);
