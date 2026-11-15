begin;
alter table public.ai_business_contacts
  add column how_met text not null default '' check(length(how_met)<=2000);
comment on column public.ai_business_contacts.how_met is 'Owner-provided connection origin or relationship. Empty means not recorded; no inferred dates or relationship edges.';
commit;
