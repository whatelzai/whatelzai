import type Stripe from "stripe";
import { z } from "zod";
import {
  mapEvent,
  currentEvent,
  seminarById,
  seminarByKey,
} from "./public-events/map";
export const eventRegistrationSchema = z.object({
  eventId: z
    .string()
    .regex(/^[A-Za-z0-9-]{1,100}$/)
    .default("ELZ-EVT-0004"),
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
  returnOffer: z.boolean().default(false),
  requestToken: z.uuid(),
  website: z.string().max(0).default(""),
});
export type EventCheckoutConfig = {
  eventId: string;
  eventKey: string;
  amount: number;
  priceId: string;
  personalOffer?: { amount: number; priceId: string };
  returnOffer?: { amount: number; priceId: string };
};
export const PLATFORM_EVENT_MARKER = "ELZ-EVT-0004";
export function platformSessionMatches(
  session: {
    mode?: string | null;
    status?: string | null;
    payment_status?: string;
    currency?: string | null;
    amount_total?: number | null;
    amount_subtotal?: number | null;
    metadata?: Record<string, string> | null;
    client_reference_id?: string | null;
  },
  configured?: EventCheckoutConfig,
) {
  const event = seminarById(session.metadata?.whatelz_event_id || "");
  const amount =
    configured?.amount ?? (event?.id === currentEvent.id ? 800 : 700);
  const eventId = configured?.eventId ?? event?.id;
  return (
    !!eventId &&
    session.mode === "payment" &&
    session.status === "complete" &&
    session.payment_status === "paid" &&
    session.currency === "sgd" &&
    session.amount_total === amount &&
    session.amount_subtotal === amount &&
    session.metadata?.whatelz_event_id === eventId &&
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
  configured?: EventCheckoutConfig,
): Stripe.Checkout.SessionCreateParams {
  const event = seminarByKey(attempt.event_key || mapEvent.key);
  if (!event && !configured) throw Error("Unknown registration event");
  const eventId = configured?.eventId ?? event!.id;
  const path = `/events/register?event=${encodeURIComponent(eventId)}`;
  return {
    mode: "payment",
    client_reference_id: attempt.id,
    customer_email: attempt.email,
    metadata: { whatelz_event_id: eventId },
    line_items: [
      {
        price:
          configured?.priceId ??
          (event!.id === mapEvent.id
            ? "price_1UZvRuPA71qp9sGS6HIJUA8N"
            : "price_1UbbJePA71qp9sGSyhBLclEo"),
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

export function configForReservedAttempt(
  config: EventCheckoutConfig,
  attempt: {
    amount: number;
    code_hash?: string | null;
    return_offer_id?: string | null;
  },
) {
  if (
    config.personalOffer &&
    attempt.code_hash &&
    attempt.amount === config.personalOffer.amount
  )
    return {
      ...config,
      amount: config.personalOffer.amount,
      priceId: config.personalOffer.priceId,
    };
  if (attempt.amount === config.amount) return config;
  if (
    config.returnOffer &&
    attempt.return_offer_id &&
    z.uuid().safeParse(attempt.return_offer_id).success &&
    attempt.amount === config.returnOffer.amount
  )
    return {
      ...config,
      amount: config.returnOffer.amount,
      priceId: config.returnOffer.priceId,
    };
  throw Error("Registration amount is not authorized");
}
