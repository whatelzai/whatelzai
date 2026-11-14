import type Stripe from "stripe";
import { z } from "zod";
import {
  mapEvent,
  currentEvent,
  seminarById,
  seminarByKey,
  registrationPath,
} from "./public-events/map";
export const eventRegistrationSchema = z.object({
  eventId: z.enum(["ELZ-EVT-0004", "ELZ-EVT-0005"]).default("ELZ-EVT-0004"),
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
  const event = seminarById(session.metadata?.whatelz_event_id || "");
  const amount = event?.id === currentEvent.id ? 800 : 700;
  return (
    !!event &&
    session.mode === "payment" &&
    session.status === "complete" &&
    session.payment_status === "paid" &&
    session.currency === "sgd" &&
    session.amount_total === amount &&
    session.amount_subtotal === amount &&
    session.metadata?.whatelz_event_id === event.id &&
    z.uuid().safeParse(session.client_reference_id).success
  );
}

// Only opaque references and event/payment data leave Whatelz. Attendee contact
// name and phone are deliberately absent. Email is shared only to prefill payment,
// explicitly requested by the organizer.
export function platformCheckoutParams(
  attempt: {
    id: string;
    created_at: string;
    email: string;
    event_key?: string;
  },
  origin: string,
): Stripe.Checkout.SessionCreateParams {
  const event = seminarByKey(attempt.event_key || mapEvent.key);
  if (!event) throw Error("Unknown registration event");
  const path = registrationPath(event);
  return {
    mode: "payment",
    client_reference_id: attempt.id,
    customer_email: attempt.email,
    metadata: { whatelz_event_id: event.id },
    line_items: [
      {
        price:
          event.id === mapEvent.id
            ? "price_1UZvRuPA71qp9sGS6HIJUA8N"
            : "price_1UbbJePA71qp9sGSyhBLclEo",
        quantity: 1,
      },
    ],
    expires_at: Math.floor(Date.parse(attempt.created_at) / 1000) + 3600,
    success_url: `${origin}${path}&payment=returned`,
    cancel_url: `${origin}${path}&payment=cancelled`,
    integration_identifier: "whatelz_event_signup_qkfzramh",
  } as Stripe.Checkout.SessionCreateParams;
}

export function paymentFreezeUntil(startedAt: string | null) {
  return startedAt ? Date.parse(startedAt) + 180000 : 0;
}
