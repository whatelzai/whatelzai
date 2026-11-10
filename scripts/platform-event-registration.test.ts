import assert from "node:assert/strict";
import test from "node:test";
import {
  eventRegistrationSchema,
  platformSessionMatches,
  platformCheckoutParams,
  paymentFreezeUntil,
} from "../lib/event-registration-policy";
test("the payment request contains no attendee contact data or promo code", () => {
  const params = platformCheckoutParams(
    {
      id: "8b531f30-6599-4b9b-9247-2b68f68c2ff9",
      created_at: "2026-11-10T08:00:00Z",
    },
    "https://whatelz.ai",
  );
  const serialized = JSON.stringify(params);
  assert.equal(params.expires_at, Date.parse("2026-11-10T09:00:00Z") / 1000);
  for (const key of [
    "customer_email",
    "phone_number_collection",
    "name_collection",
    "customer",
    "discounts",
  ])
    assert.equal(key in params, false);
  assert.equal(
    params.client_reference_id,
    "8b531f30-6599-4b9b-9247-2b68f68c2ff9",
  );
  assert.equal(params.line_items?.[0].quantity, 1);
  assert.equal(params.line_items?.[0].price, "price_1UZvRuPA71qp9sGS6HIJUA8N");
  assert.ok(!serialized.includes("attendee"));
});
test("a reference alone never confirms a payment", () => {
  const paid = {
    mode: "payment",
    status: "complete",
    payment_status: "paid",
    currency: "sgd",
    amount_total: 700,
    amount_subtotal: 700,
    metadata: { whatelz_event_id: "ELZ-EVT-0004" },
    client_reference_id: "8b531f30-6599-4b9b-9247-2b68f68c2ff9",
  };
  assert.equal(platformSessionMatches(paid), true);
  for (const changed of [
    { status: "open" },
    { payment_status: "unpaid" },
    { amount_total: 0 },
    { amount_total: 9700 },
    { amount_subtotal: 1 },
    { currency: "usd" },
    { metadata: {} },
    { client_reference_id: "not-an-id" },
  ])
    assert.equal(platformSessionMatches({ ...paid, ...changed }), false);
});
test("registration requires validated contact data, rejects spam fields and normalizes email", () => {
  const input = {
    name: " Edmund ",
    email: "ELZ@example.test",
    phone: "+65 8123 4567",
    requestToken: "8b531f30-6599-4b9b-9247-2b68f68c2ff9",
    code: "",
  };
  const result = eventRegistrationSchema.parse(input);
  assert.equal(result.email, "elz@example.test");
  assert.equal(result.phone, "+6581234567");
  for (const changed of [
    { name: "" },
    { email: "invalid" },
    { phone: "abc" },
    { requestToken: "invalid" },
    { website: "bot" },
  ])
    assert.equal(
      eventRegistrationSchema.safeParse({ ...input, ...changed }).success,
      false,
    );
});

test("the payment waiting period lasts three minutes without expiring its checkout", () => {
  assert.equal(
    paymentFreezeUntil("2026-11-10T08:00:00Z"),
    Date.parse("2026-11-10T08:03:00Z"),
  );
  assert.equal(paymentFreezeUntil(null), 0);
  const params = platformCheckoutParams(
    {
      id: "8b531f30-6599-4b9b-9247-2b68f68c2ff9",
      created_at: "2026-11-10T08:00:00Z",
    },
    "https://whatelz.ai",
  );
  assert.ok(
    params.expires_at! * 1000 > paymentFreezeUntil("2026-11-10T08:00:00Z"),
  );
});
