begin;
alter table public.ai_business_contacts
  add column location text check (location in ('SG', 'KL', 'PG'));
comment on column public.ai_business_contacts.location is
  'Owner-assigned invite location: SG Singapore, KL Kuala Lumpur, PG Penang. Null means not set; not nationality.';
commit;
