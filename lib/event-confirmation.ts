import type Stripe from "stripe";
import { canFulfillCheckout } from "./stripe-fulfillment";
import { mapEvent } from "./public-events/map";

export const MAP_PAYMENT_LINK = "plink_1UZvSJPA71qp9sGS9gBTQzhO";
// Retain fulfilment for existing tickets and delayed legacy checkout events.
export const LEGACY_MAP_PAYMENT_LINK = "plink_1UZAmbPA71qp9sGSkqgyUEvw";
export function mapConfirmation(session: Stripe.Checkout.Session) {
  const link =
    typeof session.payment_link === "string"
      ? session.payment_link
      : session.payment_link?.id;
  if (
    (link !== MAP_PAYMENT_LINK && link !== LEGACY_MAP_PAYMENT_LINK) ||
    !canFulfillCheckout(session)
  )
    return null;
  const email = session.customer_details?.email ?? session.customer_email;
  if (!email) throw new Error("Event registration has no email");
  const name = session.customer_details?.name?.trim() || "there";
  return {
    ...eventConfirmationMessage(email, name),
    key: `map-confirmation/${session.id}`,
  };
}

export function eventConfirmationMessage(
  email: string,
  name = "there",
  event: {
    id: string;
    title: string;
    dateLabel: string;
    venue: string | null;
    address: string | null;
    path: string;
    timeLabel?: string | null;
  } = mapEvent,
) {
  return {
    to: email,
    subject: `You’re confirmed — ${event.title}`,
    text: `Hi ${name},\n\nYour place at ${event.title} is confirmed!\n\nEvent ID: ${event.id}\n${event.dateLabel}\n${event.timeLabel?.replace("UTC+8", "Singapore time") || "See the event page for timing"}\n${event.venue || "Venue details on the event page"}\n${event.address || ""}\n\nWe’re looking forward to sharing practical ideas and conversation.\n\nLooking forward to meeting you!\n\nEdmund Lin Zhenming\nhttps://whatelz.ai${event.path}`,
  };
}
