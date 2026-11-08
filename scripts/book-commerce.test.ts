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
