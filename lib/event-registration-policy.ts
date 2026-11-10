import type Stripe from "stripe";
import { z } from "zod";
export const eventRegistrationSchema = z.object({
  name: z.string().trim().min(1).max(160),
  email: z
    .string()
    .trim()
    .max(254)
    .pipe(z.email())
    .transform((v) => v.toLowerCase()),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{7,24}$/)
    .transform((v) => v.replace(/[ ()-]/g, "")),
  code: z.string().trim().max(64).default(""),
  requestToken: z.uuid(),
  website: z.string().max(0).default(""),
});
export const PLATFORM_EVENT_MARKER = "ELZ-EVT-0004";
export function platformSessionMatches(session: {
  mode?: string | null;
  status?: string | null;
  payment_status?: string;
  currency?: string | null;
  amount_total?: number | null;
  amount_subtotal?: number | null;
  metadata?: Record<string, string> | null;
  client_reference_id?: string | null;
}) {
  return (
    session.mode === "payment" &&
    session.status === "complete" &&
    session.payment_status === "paid" &&
    session.currency === "sgd" &&
    session.amount_total === 700 &&
    session.amount_subtotal === 700 &&
    session.metadata?.whatelz_event_id === PLATFORM_EVENT_MARKER &&
    z.uuid().safeParse(session.client_reference_id).success
  );
}

// Only opaque references and event/payment data leave Whatelz. Attendee contact
// fields are deliberately absent, including customer_email and customer metadata.
export function platformCheckoutParams(
  attempt: { id: string; created_at: string },
  origin: string,
): Stripe.Checkout.SessionCreateParams {
  return {
    mode: "payment",
    client_reference_id: attempt.id,
    metadata: { whatelz_event_id: PLATFORM_EVENT_MARKER },
    line_items: [{ price: "price_1UZvRuPA71qp9sGS6HIJUA8N", quantity: 1 }],
    expires_at: Math.floor(Date.parse(attempt.created_at) / 1000) + 3600,
    success_url: `${origin}/events/register?payment=returned`,
    cancel_url: `${origin}/events/register?payment=cancelled`,
    integration_identifier: "whatelz_event_signup_qkfzramh",
  } as Stripe.Checkout.SessionCreateParams;
}

export function paymentFreezeUntil(startedAt: string | null) {
  return startedAt ? Date.parse(startedAt) + 180000 : 0;
}
