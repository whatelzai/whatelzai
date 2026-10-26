-- Private manual ledger. No bank integration, seed balances or automated payments.
create table public.personal_money_recurring (
 owner_id uuid not null references public.users(id), id uuid not null,
 name text not null check(length(name) between 1 and 200),
 amount_minor bigint not null check(amount_minor between 1 and 999999999),
 currency text not null check(currency in ('SGD','MYR','USD')),
 account text not null check(length(account) between 1 and 80),
 jar text not null check(jar in ('FFA','LTSS','EDU','NECC','PLAY','GIVE','TAX','UNALLOCATED','BUSINESS')),
 category text not null check(length(category) between 1 and 60),
 scope text not null check(scope in ('personal','ai_business','network_marketing')),
 cadence text not null check(cadence in ('weekly','monthly','yearly')),
 next_due date not null, anchor_day int not null check(anchor_day between 1 and 31),
 anchor_month int not null check(anchor_month between 1 and 12),
 decision text not null check(decision in ('keep','review','cancel')),
 notes text not null default '' check(length(notes)<=500), active boolean not null default true,
 created_at timestamptz not null default now(), primary key(owner_id,id)
);
create table public.personal_money_entries (
 owner_id uuid not null references public.users(id), id uuid not null,
 kind text not null check(kind in ('expense','income','transfer','refund','opening')),
 occurred_on date not null, amount_minor bigint not null check(amount_minor between 1 and 999999999),
 currency text not null check(currency in ('SGD','MYR','USD')),
 jar text not null check(jar in ('FFA','LTSS','EDU','NECC','PLAY','GIVE','TAX','UNALLOCATED','BUSINESS')),
 account text not null check(length(account) between 1 and 80),
 description text not null check(length(description) between 1 and 200),
 category text not null check(length(category) between 1 and 60),
 scope text not null check(scope in ('personal','ai_business','network_marketing')),
 to_account text check(length(to_account) between 1 and 80),
 to_jar text check(to_jar in ('FFA','LTSS','EDU','NECC','PLAY','GIVE','TAX','UNALLOCATED','BUSINESS')),
 to_currency text check(to_currency in ('SGD','MYR','USD')),
 to_amount_minor bigint check(to_amount_minor between 1 and 999999999),
 recurring_id uuid, recurring_due date, voided boolean not null default false,
 created_at timestamptz not null default now(), primary key(owner_id,id),
 foreign key(owner_id,recurring_id) references public.personal_money_recurring(owner_id,id),
 unique(owner_id,recurring_id,recurring_due),
 check ((recurring_id is null)=(recurring_due is null)),
 check ((kind='transfer' and to_account is not null and to_jar is not null and to_currency is not null and to_amount_minor is not null
   and (currency<>to_currency or amount_minor=to_amount_minor)
   and (account<>to_account or jar<>to_jar or currency<>to_currency))
 or (kind<>'transfer' and to_account is null and to_jar is null and to_currency is null and to_amount_minor is null))
);
create index personal_money_month on public.personal_money_entries(owner_id,occurred_on desc,created_at desc,id);
create index personal_money_due on public.personal_money_recurring(owner_id,next_due) where active;
alter table public.personal_money_entries enable row level security;
alter table public.personal_money_recurring enable row level security;
revoke all on public.personal_money_entries,public.personal_money_recurring from public,anon,authenticated;
grant select,insert,update on public.personal_money_entries,public.personal_money_recurring to service_role;

-- Database aggregation avoids row-limit truncation in monthly and lifetime figures.
create function public.personal_money_summary(p_owner uuid,p_start date,p_end date)
returns jsonb language sql stable security invoker set search_path='' as $$
with activity as (
 select currency,jar,kind,sum(amount_minor)::bigint total from public.personal_money_entries
 where owner_id=p_owner and not voided and occurred_on>=p_start and occurred_on<p_end
 group by currency,jar,kind
), legs as (
 select currency,jar,case when kind in ('expense','transfer') then -amount_minor else amount_minor end amount
 from public.personal_money_entries where owner_id=p_owner and not voided and occurred_on<p_end
 union all
 select to_currency,to_jar,to_amount_minor from public.personal_money_entries
 where owner_id=p_owner and not voided and kind='transfer' and occurred_on<p_end
), balances as (select currency,jar,sum(amount)::bigint total from legs group by currency,jar)
select jsonb_build_object('activity',coalesce((select jsonb_agg(to_jsonb(a)) from activity a),'[]'::jsonb),
 'balances',coalesce((select jsonb_agg(to_jsonb(b)) from balances b),'[]'::jsonb)) $$;

-- Recording a bill and advancing its date commit together; locks and uniqueness prevent double spending.
create function public.personal_money_record_bill(p_owner uuid,p_rule uuid,p_request uuid,p_due date,p_paid date,p_amount bigint)
returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.personal_money_recurring; prior public.personal_money_entries; next_date date; base date;
begin
 select * into r from public.personal_money_recurring where owner_id=p_owner and id=p_rule for update;
 if not found then raise exception 'Rule not found'; end if;
 select * into prior from public.personal_money_entries where owner_id=p_owner and id=p_request;
 if found then
   if prior.recurring_id=p_rule and prior.recurring_due=p_due and prior.occurred_on=p_paid and prior.amount_minor=p_amount then return prior.id; end if;
   raise exception 'Request conflict';
 end if;
 if not r.active or r.next_due<>p_due then raise exception 'Bill changed or already recorded'; end if;
 if p_amount not between 1 and 999999999 then raise exception 'Invalid amount'; end if;
 insert into public.personal_money_entries(owner_id,id,kind,occurred_on,amount_minor,currency,jar,account,description,category,scope,recurring_id,recurring_due)
 values(p_owner,p_request,'expense',p_paid,p_amount,r.currency,r.jar,r.account,r.name,r.category,r.scope,r.id,p_due);
 if r.cadence='weekly' then next_date:=p_due+7;
 else
   if r.cadence='monthly' then base:=(date_trunc('month',p_due)+interval '1 month')::date;
   else base:=make_date(extract(year from p_due)::int+1,r.anchor_month,1); end if;
   next_date:=base+least(r.anchor_day,extract(day from (base+interval '1 month - 1 day'))::int)-1;
 end if;
 update public.personal_money_recurring set next_due=next_date where owner_id=p_owner and id=p_rule;
 return p_request;
end $$;
revoke all on function public.personal_money_summary(uuid,date,date),public.personal_money_record_bill(uuid,uuid,uuid,date,date,bigint) from public,anon,authenticated;
grant execute on function public.personal_money_summary(uuid,date,date),public.personal_money_record_bill(uuid,uuid,uuid,date,date,bigint) to service_role;

-- Owner configuration is private data, never embedded in client bundles.
create table public.personal_money_plan (
 owner_id uuid primary key references public.users(id),
 jar_base_minor bigint not null check(jar_base_minor>=0),
 tax_minor bigint not null check(tax_minor>=0),
 reserve_target_minor bigint not null check(reserve_target_minor>=0),
 income_account text not null check(length(income_account) between 1 and 80),
 jar_plan jsonb not null check(jsonb_typeof(jar_plan)='array')
);
alter table public.personal_money_plan enable row level security;
revoke all on public.personal_money_plan from public,anon,authenticated;
grant select,insert,update on public.personal_money_plan to service_role;
