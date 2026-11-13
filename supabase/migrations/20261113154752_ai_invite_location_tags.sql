begin;
alter table public.ai_business_contacts
  add column locations text[] not null default '{}',
  add constraint ai_business_contacts_location_tags_check check (
    locations <@ array['SG','KL','PG']::text[]
    and array_position(locations,null) is null
    and cardinality(locations) =
      ('SG'=any(locations))::integer + ('KL'=any(locations))::integer + ('PG'=any(locations))::integer
  );
update public.ai_business_contacts set locations=array[location] where location is not null;
comment on column public.ai_business_contacts.locations is 'Overlapping owner-assigned invite regions. Empty means not set; one contact may belong to SG, KL and PG.';
comment on column public.ai_business_contacts.location is 'Legacy single location for rollback/read compatibility. New forms write locations and mirror its first tag here.';
commit;
