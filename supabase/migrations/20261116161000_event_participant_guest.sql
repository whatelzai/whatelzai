begin;
-- Internal participant classification, independent of authentication and community access.
alter table public.event_people add column account_type text not null default 'guest'
  check (account_type = 'guest');
comment on column public.event_people.account_type is 'Internal event participant classification. Guest does not create an auth account or grant membership/access. Extend types only with an explicit owner-approved migration.';
-- Existing private RLS and browser-denied grants are unchanged.
commit;
