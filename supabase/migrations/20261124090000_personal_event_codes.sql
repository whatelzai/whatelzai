begin;
alter table public.event_signup_codes
  add column recipient_email text,
  add column ticket_amount integer,
  add constraint personal_ticket_requires_recipient check (
    (recipient_email is null and ticket_amount is null) or
    (recipient_email is not null and recipient_email=lower(trim(recipient_email)) and
     ticket_amount is not null and ticket_amount>0 and max_uses=1)
  );
create unique index event_signup_code_recipient on public.event_signup_codes(event_key,recipient_email) where recipient_email is not null;
-- Reservation RPC already holds the event lock and checks expiry and usage.
create function public.price_personal_event_code() returns trigger language plpgsql set search_path='' as $$
declare c public.event_signup_codes;
begin
  select * into strict c from public.event_signup_codes where event_key=new.event_key and code_hash=new.code_hash;
  if c.recipient_email is not null then
    if c.recipient_email<>new.email then raise exception 'INVALID_CODE'; end if;
    new.amount:=c.ticket_amount;
  end if;
  return new;
end $$;
create trigger price_personal_event_code before insert on public.event_signup_attempts
for each row when (new.code_hash is not null) execute function public.price_personal_event_code();
commit;
