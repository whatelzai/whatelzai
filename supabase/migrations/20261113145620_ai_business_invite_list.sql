begin;
create table public.ai_business_contacts (
 id uuid primary key,
 owner_id uuid not null references public.users(id),
 event_person_id uuid references public.event_people(id),
 source_key text not null,
 name text not null check(length(trim(name)) between 1 and 160),
 email text check(email is null or (email=lower(trim(email)) and length(email)<=254)),
 phone text not null default '' check(length(phone)<=40),
 interests text not null default '' check(length(interests)<=2000),
 context text not null default '' check(length(context)<=4000),
 collaboration text not null default '' check(length(collaboration)<=2000),
 next_step text not null default '' check(length(next_step)<=500),
 follow_up_on date,
 relationship text not null default 'getting_to_know' check(relationship in ('getting_to_know','interested','collaborator','client')),
 status text not null default 'active' check(status in ('active','paused','do_not_contact')),
 priority boolean not null default false,
 revision integer not null default 1 check(revision>0 and revision<2147483647),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(id,owner_id), unique(owner_id,source_key), unique(owner_id,email), unique(owner_id,event_person_id)
);
create table public.ai_business_invitations (
 id uuid primary key,
 owner_id uuid not null references public.users(id), contact_id uuid not null,
 invited_on date not null, event_label text not null default '' check(length(event_label)<=200),
 channel text not null check(channel in ('whatsapp','in_person','email','phone','other')),
 response text not null default 'awaiting_reply' check(response in ('awaiting_reply','interested','maybe','declined','no_reply')),
 notes text not null default '' check(length(notes)<=2000),
 voided boolean not null default false,
 revision integer not null default 1 check(revision>0 and revision<2147483647),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(contact_id,owner_id) references public.ai_business_contacts(id,owner_id)
);
create table public.ai_business_attendance_links (
 id uuid primary key,
 owner_id uuid not null references public.users(id), contact_id uuid not null,
 ticket_id uuid unique references public.event_registrations(id),
 historical_id uuid unique references public.event_attendance(id),
 source_key text not null unique,
 check((ticket_id is not null)::integer+(historical_id is not null)::integer=1),
 foreign key(contact_id,owner_id) references public.ai_business_contacts(id,owner_id)
);
create index ai_business_contacts_followup on public.ai_business_contacts(owner_id,status,follow_up_on);
create index ai_business_invitations_contact on public.ai_business_invitations(owner_id,contact_id,invited_on desc);
create index ai_business_attendance_contact on public.ai_business_attendance_links(owner_id,contact_id);
alter table public.ai_business_contacts enable row level security;
alter table public.ai_business_invitations enable row level security;
alter table public.ai_business_attendance_links enable row level security;
revoke all on public.ai_business_contacts,public.ai_business_invitations,public.ai_business_attendance_links from public,anon,authenticated;
grant select,insert,update on public.ai_business_contacts,public.ai_business_invitations to service_role;
grant select,insert on public.ai_business_attendance_links to service_role;
comment on table public.ai_business_contacts is 'Owner-private AI business contact context. Not member leads or an automatic potential score.';
commit;
