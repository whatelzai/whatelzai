import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import {
  configForReservedAttempt,
  platformCheckoutParams,
  platformSessionMatches,
} from "../lib/event-registration-policy";
import { offerSeconds, offerTime } from "../lib/event-return-offer/model";
const source = "d61b02e0-76c3-422c-b65d-e9ec570d7ff2",
  target = "598a1db6-3c4a-4f81-9f3b-79fb8c1425aa",
  registration = "00000000-0000-4000-8000-000000000001",
  feedback = "00000000-0000-4000-8000-000000000002",
  eventKey = "ai-skillset-money-mindset-20261208",
  hash = "a".repeat(64);
const migration = (name: string) =>
  readFileSync(`supabase/migrations/${name}.sql`, "utf8");
async function fixture() {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;
 create table public.users(id uuid primary key);
 create table public.events(id uuid primary key,type text,slug text,name text,date date,location text,published boolean,metadata jsonb);
 insert into events values('${source}','training','nov12','Previous event','2026-11-12',null,true,'{"event_key":"nov12","event_id":"ELZ-EVT-0004"}');
 create table public.event_registrations(id uuid primary key default gen_random_uuid(),event_key text,email text,attendee_name text,phone text,status text default 'confirmed',checked_in_at timestamptz,stripe_checkout_session_id text not null unique,stripe_payment_intent_id text,created_at timestamptz default now());
 create table public.event_refund_ledger(stripe_payment_intent_id text);
 create table public.event_feedback(id uuid primary key,event_id uuid references events(id),registration_id uuid references event_registrations(id),created_at timestamptz default now());
 create table public.event_feedback_forms(id text primary key);
 insert into event_feedback_forms values('feedback-v4-20261119');
 create table public.event_feedback_form_bindings(event_id uuid primary key references events(id),form_id text references event_feedback_forms(id));
 grant select,insert,update on event_registrations to service_role;grant select on events,event_feedback to service_role;`);
  await db.exec(migration("20261110054914_platform_event_registration"));
  await db.exec(migration("20261114071547_event_occurrence_registration"));
  await db.exec(migration("20261119010000_event_return_offer_support"));
  await db.exec(
    `insert into event_registrations(id,event_key,email,status,checked_in_at) values('${registration}','nov12','attendee@example.test','confirmed',now()-interval '1 day');insert into event_feedback(id,event_id,registration_id) values('${feedback}','${source}','${registration}');`,
  );
  return db;
}
const issue = (db: PGlite, token = hash, id = feedback) =>
  db.query<Record<string, unknown>>(
    "select (public.issue_event_return_offer($1,$2,$3)).*",
    [id, target, token],
  );
const claim = (db: PGlite, token = hash) =>
  db.query("select (public.claim_event_return_offer($1)).*", [token]);
const reserve = (
  db: PGlite,
  request = "b".repeat(64),
  email = "attendee@example.test",
  token: string | null = hash,
  key = eventKey,
) =>
  db.query<{ id: string; amount: number; return_offer_id: string }>(
    "select (public.reserve_event_signup_with_return($1,$2,$3,$4,$5,$6)).*",
    [key, request, "Attendee", email, "+60123456789", token],
  );
test("offer needs a saved recent response and recorded check-in, and one fixed deadline cannot be reset or shared", async () => {
  const db = await fixture();
  try {
    assert.equal((await issue(db)).rows[0].id, null); // not published/open yet
    await db.exec(migration("20261119010100_publish_december8_weekly"));
    await db.exec(
      `update event_registrations set checked_in_at=null where id='${registration}'`,
    );
    assert.equal((await issue(db)).rows[0].id, null);
    await db.exec(
      `update event_registrations set checked_in_at=now()-interval '1 day' where id='${registration}'`,
    );
    const first = (await issue(db)).rows[0];
    assert.ok(first.id);
    assert.equal((await issue(db)).rows[0].expires_at instanceof Date, true);
    const again = (await issue(db)).rows[0];
    assert.deepEqual(again.expires_at, first.expires_at);
    assert.equal(again.id, first.id);
    assert.equal((await issue(db, "c".repeat(64))).rows[0].id, null);
    await assert.rejects(reserve(db), /RETURN_OFFER_EXPIRED/); // must claim on thank-you page first
    await claim(db);
    await assert.rejects(
      reserve(db, "b".repeat(64), "friend@example.test"),
      /RETURN_OFFER_MISMATCH/,
    );
    await assert.rejects(
      reserve(db, "b".repeat(64), "attendee@example.test", "f".repeat(64)),
      /RETURN_OFFER_EXPIRED/,
    );
    await assert.rejects(
      db.query(
        "select public.reserve_event_signup_for_event($1,$2,$3,$4,$5,$6)",
        [
          eventKey,
          "d".repeat(64),
          "Someone",
          "new@example.test",
          "+6581234567",
          "REJOIN",
        ],
      ),
      /INVALID_CODE/,
    );
    const attempt = (await reserve(db)).rows[0];
    assert.equal(attempt.amount, 800);
    assert.equal(attempt.return_offer_id, first.id);
    assert.equal((await reserve(db)).rows[0].id, attempt.id);
    await assert.rejects(reserve(db, "e".repeat(64)), /REGISTRATION_PENDING/);
    await db.exec(
      `update event_return_offers set expires_at=now()-interval '1 second'`,
    );
    await assert.rejects(claim(db), /RETURN_OFFER_EXPIRED/);
    await assert.rejects(reserve(db, "e".repeat(64)), /RETURN_OFFER_EXPIRED/);
    assert.equal((await reserve(db)).rows[0].id, attempt.id); // safely resume an existing payment even after the promotion ends
    await db.exec(
      `update event_registrations set is_test=true where id='${registration}';update event_signup_attempts set stripe_session_id='cs_test',state='checkout' where id='${attempt.id}'`,
    );
    const confirmed = await db.query<{ ticket: string }>(
      "select public.confirm_event_signup($1,$2,$3) as ticket",
      [attempt.id, "cs_test", "pi_test"],
    );
    const ticket = await db.query<{ is_test: boolean }>(
      "select is_test from event_registrations where id=$1",
      [confirmed.rows[0].ticket],
    );
    assert.equal(ticket.rows[0].is_test, true);

    await db.exec("set role anon");
    await assert.rejects(issue(db), /permission denied/);
    await assert.rejects(
      db.query("select * from event_return_offers"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
test("leaving without claim dismisses the offer; ordinary signup charges13 and shares the same seat inventory", async () => {
  const db = await fixture();
  try {
    await db.exec(migration("20261119010100_publish_december8_weekly"));
    await issue(db);
    await db.exec("update event_return_offers set dismissed_at=now()");
    await assert.rejects(claim(db), /RETURN_OFFER_EXPIRED/);
    const standard = await db.query<{ amount: number }>(
      "select (public.reserve_event_signup_for_event($1,$2,$3,$4,$5,null)).*",
      [
        eventKey,
        "d".repeat(64),
        "Attendee",
        "attendee@example.test",
        "+6581234567",
      ],
    );
    assert.equal(standard.rows[0].amount, 1300);
    await db.exec(
      `update event_signup_offers set capacity=1 where event_key='${eventKey}'`,
    );
    await assert.rejects(
      db.query(
        "select public.reserve_event_signup_for_event($1,$2,$3,$4,$5,null)",
        [
          eventKey,
          "e".repeat(64),
          "Other",
          "other@example.test",
          "+6581234567",
        ],
      ),
      /EVENT_FULL/,
    );
  } finally {
    await db.close();
  }
});
test("expired feedback, unregistered and cancelled attendees never receive a new offer", async () => {
  const db = await fixture();
  try {
    await db.exec(migration("20261119010100_publish_december8_weekly"));
    await db.exec(
      `update event_feedback set created_at=now()-interval '6 minutes'`,
    );
    assert.equal((await issue(db)).rows[0].id, null);
    await db.exec(
      `update event_feedback set created_at=now();update event_registrations set status='cancelled'`,
    );
    assert.equal((await issue(db)).rows[0].id, null);
    assert.equal(
      (await issue(db, hash, "00000000-0000-4000-8000-000000000099")).rows[0]
        .id,
      null,
    );
  } finally {
    await db.close();
  }
});
test("checkout and payment verification use the persisted authorized8 or13 amount, never a public promo string", () => {
  const config = {
    eventId: "ELZ-EVT-0010",
    eventKey,
    amount: 1300,
    priceId: "price_public13",
    returnOffer: { amount: 800, priceId: "price_return8" },
  };
  const id = "00000000-0000-4000-8000-000000000010";
  const discounted = configForReservedAttempt(config, {
    amount: 800,
    return_offer_id: id,
  });
  assert.equal(discounted.priceId, "price_return8");
  assert.equal(
    configForReservedAttempt(config, { amount: 1300 }).priceId,
    "price_public13",
  );
  assert.throws(() => configForReservedAttempt(config, { amount: 800 }));
  assert.throws(() =>
    configForReservedAttempt(config, { amount: 700, return_offer_id: id }),
  );
  const params = platformCheckoutParams(
    {
      id,
      created_at: "2026-11-19T00:00:00Z",
      email: "attendee@example.test",
      event_key: eventKey,
    },
    "https://whatelz.ai",
    discounted,
  );
  assert.equal(params.line_items?.[0].price, "price_return8");
  assert.equal("discounts" in params, false);
  assert.equal("payment_method_types" in params, false);
  const session = {
    mode: "payment",
    status: "complete",
    payment_status: "paid",
    currency: "sgd",
    amount_total: 800,
    amount_subtotal: 800,
    metadata: { whatelz_event_id: config.eventId },
    client_reference_id: id,
  };
  assert.equal(platformSessionMatches(session, discounted), true);
  assert.equal(platformSessionMatches(session, config), false);
  assert.equal(
    platformSessionMatches({ ...session, amount_total: 1300 }, discounted),
    false,
  );
  assert.equal(
    platformSessionMatches(
      { ...session, payment_status: "unpaid" },
      discounted,
    ),
    false,
  );
  assert.equal(
    offerSeconds("2026-11-19T00:05:00Z", Date.parse("2026-11-19T00:00:00Z")),
    300,
  );
  assert.equal(
    offerSeconds("2026-11-19T00:05:00Z", Date.parse("2026-11-19T00:06:00Z")),
    0,
  );
  assert.equal(offerTime(299), "4:59");
});
