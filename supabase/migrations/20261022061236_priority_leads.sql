-- Private prioritization changes presentation only, never membership or access.
alter table public.member_leads add column is_priority boolean not null default false;
create index member_leads_owner_priority_follow_up on public.member_leads(owner_id,is_priority desc,follow_up_on,name,id);
alter table public.member_lead_activities drop constraint member_lead_activities_status_check;
alter table public.member_lead_activities add constraint member_lead_activities_status_check
  check(status in ('Attended','Planned','Tentative','To invite','Conversation','Missed','Cancelled'));
