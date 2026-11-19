begin;
alter table public.ai_business_contacts
 add column invite_name text not null default '' check(length(invite_name)<=160),
 add column registration_name text check(registration_name is null or length(trim(registration_name)) between 1 and 160),
 add column testimonial_name text check(testimonial_name is null or length(trim(testimonial_name)) between 1 and 160),
 add column primary_email text check(primary_email is null or (primary_email=lower(trim(primary_email)) and length(primary_email)<=254)),
 add column email2 text check(email2 is null or (email2=lower(trim(email2)) and length(email2)<=254));
update public.ai_business_contacts set invite_name=name,primary_email=email;
alter table public.ai_business_contacts
 add constraint ai_business_contacts_primary_email_unique unique(owner_id,primary_email),
 add constraint ai_business_contacts_email_mirror check(email is not distinct from primary_email),
 add constraint ai_business_contacts_primary_name_precedence check(name=coalesce(registration_name,testimonial_name,nullif(invite_name,''),name));
create table public.ai_business_testimonial_links (
 owner_id uuid not null references public.users(id),
 contact_id uuid not null,
 testimonial_id uuid not null references public.testimonials(id),
 match_method text not null check(match_method in ('owner_confirmed','testimonial_only')),
 confirmed_by uuid not null references public.users(id),
 confirmed_at timestamptz not null default now(),
 primary key(owner_id,testimonial_id),
 foreign key(contact_id,owner_id) references public.ai_business_contacts(id,owner_id)
);
create index ai_business_testimonial_contact on public.ai_business_testimonial_links(owner_id,contact_id);
alter table public.ai_business_testimonial_links enable row level security;
revoke all on public.ai_business_testimonial_links from public,anon,authenticated;
grant select,insert on public.ai_business_testimonial_links to service_role;
comment on column public.ai_business_contacts.name is 'Primary display name: registration, then linked testimonial, then invite name. Not an authentication claim.';
comment on column public.ai_business_contacts.primary_email is 'Self-provided registration email, mirrored in legacy email. Account ownership still requires existing verified authentication.';
comment on column public.ai_business_contacts.email2 is 'Secondary email from owner-confirmed testimonial source. Does not grant sign-in, membership or newsletter subscription.';
commit;
