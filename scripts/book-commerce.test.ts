import assert from "node:assert/strict";
import test from "node:test";
import {
  canFulfillCheckout,
  entitlementProductSlug,
  checkoutGrantKey,
} from "../lib/stripe-fulfillment";
import { isMapRegistrationOpen, mapEvent } from "../lib/public-events/map";

test("an unpaid or unfinished checkout never unlocks the book", () => {
  for (const status of ["open", "expired", null] as const)
    for (const payment_status of [
      "paid",
      "unpaid",
      "no_payment_required",
    ] as const)
      assert.equal(canFulfillCheckout({ status, payment_status }), false);
  assert.equal(
    canFulfillCheckout({ status: "complete", payment_status: "unpaid" }),
    false,
  );
});
test("paid purchases and completed free-code orders unlock equally", () => {
  assert.equal(
    canFulfillCheckout({ status: "complete", payment_status: "paid" }),
    true,
  );
  assert.equal(
    canFulfillCheckout({
      status: "complete",
      payment_status: "no_payment_required",
    }),
    true,
  );
});
test("the legacy offer grants the same book access the reader checks", () => {
  assert.equal(entitlementProductSlug("playbook-lifetime-v1"), "playbook");
  assert.equal(entitlementProductSlug("playbook"), "playbook");
  assert.equal(entitlementProductSlug("other-product"), "other-product");
});
test("repeat and delayed-success deliveries use one grant identity", () => {
  assert.equal(
    checkoutGrantKey("cs_purchase"),
    checkoutGrantKey("cs_purchase"),
  );
  assert.notEqual(checkoutGrantKey("cs_first"), checkoutGrantKey("cs_second"));
});
test("event registration closes at the UTC+8 seminar start", () => {
  const start = Date.parse(mapEvent.startsAt);
  assert.equal(isMapRegistrationOpen(start - 1), true);
  assert.equal(isMapRegistrationOpen(start), false);
  assert.equal(isMapRegistrationOpen(start + 1), false);
  assert.equal(start, Date.parse("2026-11-12T11:30:00Z"));
});

// Confirmation only follows settled registrations from the event payment link.
import type Stripe from "stripe";
import { mapConfirmation, MAP_PAYMENT_LINK } from "../lib/event-confirmation";
test("event confirmation includes venue and accepts paid or complimentary orders", () => {
  const base = {
    id: "cs_test_map",
    status: "complete",
    payment_status: "paid",
    payment_link: MAP_PAYMENT_LINK,
    customer_details: { name: "Test attendee", email: "attendee@example.test" },
  } as unknown as Stripe.Checkout.Session;
  const message = mapConfirmation(base)!;
  assert.match(message.text, /The Vibe/);
  assert.match(message.text, /Paya Lebar Square #07-16/);
  assert.equal(message.to, "attendee@example.test");
  assert.equal(message.key, "map-confirmation/cs_test_map");
  assert.ok(
    mapConfirmation({ ...base, payment_status: "no_payment_required" }),
  );
  assert.equal(mapConfirmation({ ...base, payment_status: "unpaid" }), null);
  assert.equal(mapConfirmation({ ...base, status: "open" }), null);
  assert.equal(mapConfirmation({ ...base, payment_link: "plink_other" }), null);
});

import { parseTicket } from "../lib/event-checkin-policy";
test("scanner accepts only opaque ticket IDs or canonical ticket URLs", () => {
  const id = "8b531f30-6599-4b9b-9247-2b68f68c2ff9";
  assert.equal(parseTicket(id), id);
  assert.equal(parseTicket(`https://whatelz.ai/tickets/${id}`), id);
  for (const bad of [
    `https://evil.example/tickets/${id}`,
    `https://whatelz.ai/tickets/${id}?redirect=evil`,
    "not-a-ticket",
    "javascript:alert(1)",
    `https://whatelz.ai/events/${id}`,
  ])
    assert.equal(parseTicket(bad), null);
});
