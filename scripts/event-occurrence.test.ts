import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  mapEvent,
  currentEvent,
  seminarByKey,
  registrationCookie,
  isSeminarOpen,
} from "../lib/public-events/map";
import {
  platformCheckoutParams,
  platformSessionMatches,
} from "../lib/event-registration-policy";
import { eventConfirmationMessage } from "../lib/event-confirmation";
const id = "00000000-0000-4000-8000-000000000001";
test("new checkout, email and cookie identify November19 while legacy tickets retain November12", () => {
  const checkout = platformCheckoutParams(
    {
      id,
      email: "attendee@example.test",
      created_at: "2026-11-14T00:00:00Z",
      event_key: currentEvent.key,
    },
    "https://whatelz.ai",
  );
  assert.equal(checkout.metadata?.whatelz_event_id, currentEvent.id);
  assert.equal(
    checkout.line_items?.[0].price,
    "price_1UbbJePA71qp9sGSyhBLclEo",
  );
  assert.match(checkout.success_url!, /event=ELZ-EVT-0005/);
  assert.notEqual(
    registrationCookie(currentEvent),
    registrationCookie(mapEvent),
  );
  assert.equal(seminarByKey("unknown"), undefined);
  assert.match(
    eventConfirmationMessage("a@example.test", "there", currentEvent).text,
    /19 November 2026/,
  );
  assert.match(
    eventConfirmationMessage("a@example.test").text,
    /12 November 2026/,
  );
  assert.equal(isSeminarOpen(mapEvent, Date.parse("2026-11-14")), false);
  assert.equal(isSeminarOpen(currentEvent, Date.parse("2026-11-14")), true);
  const session = {
    mode: "payment",
    status: "complete",
    payment_status: "paid",
    currency: "sgd",
    amount_total: 800,
    amount_subtotal: 800,
    metadata: { whatelz_event_id: currentEvent.id },
    client_reference_id: id,
  };
  assert.equal(platformSessionMatches(session), true);
  assert.equal(
    platformSessionMatches({
      ...session,
      amount_total: 700,
      amount_subtotal: 700,
    }),
    false,
  );
  assert.equal(
    platformSessionMatches({
      ...session,
      metadata: { whatelz_event_id: mapEvent.id },
    }),
    false,
  );
});
test("occurrence inventory, promo eligibility and confirmation remain event-scoped", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create role service_role;create table public.users(id uuid primary key);create table public.events(id uuid primary key);create table public.event_refund_ledger(stripe_payment_intent_id text primary key);create table public.event_registrations(id uuid primary key default gen_random_uuid(),event_key text,stripe_checkout_session_id text not null unique,stripe_payment_intent_id text,attendee_name text,email text,phone text,status text);`,
    );
    for (const file of [
      "20261110054914_platform_event_registration.sql",
      "20261114071547_event_occurrence_registration.sql",
    ])
      await db.exec(
        await readFile(
          new URL("../supabase/migrations/" + file, import.meta.url),
          "utf8",
        ),
      );
    await db.exec(
      `insert into public.events values('${id}');insert into public.event_signup_offers(event_key,event_id,amount,capacity,closes_at,enabled)values('nov19','${id}',800,2,now()+interval '1 day',true);insert into public.event_registrations(event_key,stripe_checkout_session_id,email,status)values('nov12','old','a@example.test','confirmed');insert into public.event_signup_codes(event_key,code_hash,max_uses,expires_at)values('nov12','old-code',10,now()+interval '1 day');`,
    );
    await assert.rejects(
      db.query(
        `select * from public.reserve_event_signup_for_event('nov19','bad','A','a@example.test','+60123456789','old-code')`,
      ),
      /INVALID_CODE/,
    );
    const a = await db.query<{ id: string; amount: number }>(
      `select id,amount from public.reserve_event_signup_for_event('nov19','one','A','a@example.test','+60123456789',null)`,
    );
    assert.equal(a.rows[0].amount, 800);
    const repeated = await db.query<{ id: string }>(
      `select id from public.reserve_event_signup_for_event('nov19','one','A','a@example.test','+60123456789',null)`,
    );
    assert.equal(repeated.rows[0].id, a.rows[0].id);
    await assert.rejects(
      db.query(
        `select * from public.reserve_event_signup_for_event('other','one','A','a@example.test','+60123456789',null)`,
      ),
      /EVENT_MISMATCH/,
    );
    await assert.rejects(
      db.query(
        `select public.confirm_event_signup('${a.rows[0].id}',null,null)`,
      ),
      /SESSION_MISMATCH/,
    );
    await db.exec(
      `update public.event_signup_attempts set stripe_session_id='new-session',state='checkout' where id='${a.rows[0].id}'`,
    );
    await db.query(
      `select public.confirm_event_signup('${a.rows[0].id}','new-session','new-payment')`,
    );
    await db.query(
      `select public.confirm_event_signup('${a.rows[0].id}','new-session','new-payment')`,
    );
    const tickets = await db.query<{ event_key: string }>(
      `select event_key from public.event_registrations where signup_attempt_id='${a.rows[0].id}'`,
    );
    assert.deepEqual(tickets.rows, [{ event_key: "nov19" }]);
    await db.query(
      `select * from public.reserve_event_signup_for_event('nov19','two','B','b@example.test','+6581234567',null)`,
    );
    await assert.rejects(
      db.query(
        `select * from public.reserve_event_signup_for_event('nov19','three','C','c@example.test','+6581234567',null)`,
      ),
      /EVENT_FULL/,
    );
    await db.exec(
      `update public.event_signup_offers set enabled=false where event_key='nov19'`,
    );
    await assert.rejects(
      db.query(
        `select * from public.reserve_event_signup_for_event('nov19','four','D','d@example.test','+6581234567',null)`,
      ),
      /REGISTRATION_CLOSED/,
    );
    const access = await db.query<{ allowed: boolean }>(
      `select has_table_privilege('anon','public.event_signup_offers','select') or has_function_privilege('authenticated','public.reserve_event_signup_for_event(text,text,text,text,text,text)','execute') as allowed`,
    );
    assert.equal(access.rows[0].allowed, false);
  } finally {
    await db.close();
  }
});
