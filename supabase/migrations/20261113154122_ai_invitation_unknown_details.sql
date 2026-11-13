begin;
alter table public.ai_business_invitations
  alter column invited_on drop not null,
  alter column channel drop not null,
  drop constraint ai_business_invitations_response_check,
  add constraint ai_business_invitations_response_check
    check(response in ('awaiting_reply','interested','maybe','declined','unavailable','no_reply')),
  add column source_key text,
  add constraint ai_business_invitations_owner_source_unique unique(owner_id,source_key);
comment on column public.ai_business_invitations.invited_on is 'Actual invitation date. Null means not recorded; event dates must not be substituted.';
comment on column public.ai_business_invitations.channel is 'Actual invitation channel. Null means not recorded.';
comment on column public.ai_business_invitations.source_key is 'Server-only idempotency reference for owner-authorized imports.';
commit;
