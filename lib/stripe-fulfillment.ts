import type Stripe from "stripe";

export function canFulfillCheckout(
  session: Pick<Stripe.Checkout.Session, "status" | "payment_status">,
) {
  return (
    session.status === "complete" &&
    (session.payment_status === "paid" ||
      session.payment_status === "no_payment_required")
  );
}
export function entitlementProductSlug(offerSlug: string) {
  return offerSlug === "playbook-lifetime-v1" ? "playbook" : offerSlug;
}
// completed and async_payment_succeeded can describe the same purchase.
export function checkoutGrantKey(sessionId: string) {
  return `checkout-session:${sessionId}`;
}
