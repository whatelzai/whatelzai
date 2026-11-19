import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as policy from "../lib/event-registration-policy";
test("webhook fulfillment checks the saved discounted reservation, session identity and exact paid amount before ticket email", async () => {
  const eventId = "ELZ-EVT-0010",
    key = "ai-skillset-money-mindset-20261208",
    id = "00000000-0000-4000-8000-000000000010";
  const config = {
    eventId,
    eventKey: key,
    amount: 1300,
    priceId: "price_13",
    returnOffer: { amount: 800, priceId: "price_8" },
  };
  let attempt: Record<string, unknown> = {
    id,
    event_key: key,
    amount: 800,
    return_offer_id: "00000000-0000-4000-8000-000000000011",
    stripe_session_id: "cs_correct",
  };
  let confirmations = 0,
    emails = 0;
  const db = {
    from: () => ({
      select() {
        return this;
      },
      eq() {
        return this;
      },
      async maybeSingle() {
        return { data: attempt, error: null };
      },
    }),
    rpc: async (name: string) => {
      assert.equal(name, "confirm_event_signup");
      confirmations++;
      return { data: "ticket", error: null };
    },
  };
  const mod = {
    exports: {} as { fulfillPlatformSession: (s: unknown) => Promise<boolean> },
  };
  const imports: Record<string, unknown> = {
    "server-only": {},
    "./event-offer": {
      checkoutConfigForMarker: async (marker: string) =>
        marker === eventId ? config : null,
    },
    "node:crypto": await import("node:crypto"),
    "./supabase-server": { supabaseAdmin: db },
    "./stripe-server": {
      getStripe: () => {
        throw Error("No network allowed");
      },
    },
    "./event-registration-policy": policy,
    "./send-event-confirmation": {
      sendStoredEventTicket: async () => {
        emails++;
      },
    },
  };
  vm.runInNewContext(
    ts.transpileModule(
      readFileSync("lib/platform-event-registration.ts", "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
    {
      module: mod,
      exports: mod.exports,
      require: (name: string) => {
        if (!(name in imports)) throw Error(name);
        return imports[name];
      },
      process: { env: {} },
    },
  );
  const paid = {
    id: "cs_correct",
    client_reference_id: id,
    metadata: { whatelz_event_id: eventId },
    mode: "payment",
    status: "complete",
    payment_status: "paid",
    amount_total: 800,
    amount_subtotal: 800,
    currency: "sgd",
  };
  for (const changed of [
    { amount_total: 1300 },
    { amount_subtotal: 1300 },
    { id: "cs_someone_else" },
    { currency: "usd" },
    { status: "open" },
  ])
    await assert.rejects(
      mod.exports.fulfillPlatformSession({ ...paid, ...changed }),
    );
  assert.equal(confirmations, 0);
  assert.equal(emails, 0);
  assert.equal(
    await mod.exports.fulfillPlatformSession({
      ...paid,
      payment_status: "unpaid",
    }),
    true,
  );
  assert.equal(confirmations, 0);
  assert.equal(await mod.exports.fulfillPlatformSession(paid), true);
  assert.equal(confirmations, 1);
  assert.equal(emails, 1);
  attempt = { ...attempt, return_offer_id: null };
  await assert.rejects(mod.exports.fulfillPlatformSession(paid));
  assert.equal(confirmations, 1);
  attempt = { ...attempt, amount: 1300 };
  assert.equal(
    await mod.exports.fulfillPlatformSession({
      ...paid,
      amount_total: 1300,
      amount_subtotal: 1300,
    }),
    true,
  );
  assert.equal(confirmations, 2);
});
