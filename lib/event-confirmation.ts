import type Stripe from "stripe";
import { canFulfillCheckout } from "./stripe-fulfillment";
import { mapEvent } from "./public-events/map";

export const MAP_PAYMENT_LINK = "plink_1UZAmbPA71qp9sGSkqgyUEvw";
export function mapConfirmation(session: Stripe.Checkout.Session) {
  const link =
    typeof session.payment_link === "string"
      ? session.payment_link
      : session.payment_link?.id;
  if (link !== MAP_PAYMENT_LINK || !canFulfillCheckout(session)) return null;
  const email = session.customer_details?.email ?? session.customer_email;
  if (!email) throw new Error("Event registration has no email");
  const name = session.customer_details?.name?.trim() || "there";
  return {
    to: email,
    subject: "You’re confirmed — Money Mindset × AI Skillset",
    text: `Hi ${name},\n\nYour place at Money Mindset × AI Skillset is confirmed!\n\nEvent ID: ${mapEvent.id}\n${mapEvent.dateLabel}\n7:30–9:30 PM · Singapore time\n${mapEvent.venue}\n${mapEvent.address}\n\nWe’ll explore AI Skillset × Money Mindset through practical ideas and conversation.\n\nLooking forward to meeting you!\n\nEdmund Lin Zhenming\nhttps://whatelz.ai${mapEvent.path}`,
    key: `map-confirmation/${session.id}`,
  };
}
