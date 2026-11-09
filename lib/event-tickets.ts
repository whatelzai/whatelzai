import "server-only";
import type Stripe from "stripe";
import { supabaseAdmin } from "./supabase-server";
import { mapEvent } from "./public-events/map";
import { mapConfirmation } from "./event-confirmation";
export const EVENT_KEY = mapEvent.key;
export const TICKET_ORIGIN = "https://whatelz.ai";
export const ticketUrl = (id: string) => `${TICKET_ORIGIN}/tickets/${id}`;
export async function ensureEventTicket(session: Stripe.Checkout.Session) {
  if (!mapConfirmation(session)) return null;
  const details = session.customer_details;
  if (!details?.name || !details.email || !details.phone)
    throw new Error("Registration requires name, email and phone");
  // Never overwrite check-in, cancellation or delivery state on webhook retries.
  const { error } = await supabaseAdmin.from("event_registrations").upsert(
    {
      event_key: EVENT_KEY,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent?.id ?? null),
      attendee_name: details.name,
      email: details.email,
      phone: details.phone,
    },
    { onConflict: "stripe_checkout_session_id", ignoreDuplicates: true },
  );
  if (error) throw new Error("Ticket could not be stored");
  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  if (paymentIntent) {
    const { data: refund, error: refundError } = await supabaseAdmin
      .from("event_refund_ledger")
      .select("stripe_payment_intent_id")
      .eq("stripe_payment_intent_id", paymentIntent)
      .maybeSingle();
    if (refundError) throw new Error("Refund status could not be checked");
    if (refund) {
      const { error: cancelError } = await supabaseAdmin
        .from("event_registrations")
        .update({ status: "cancelled" })
        .eq("stripe_checkout_session_id", session.id);
      if (cancelError)
        throw new Error("Refunded ticket could not be cancelled");
    }
  }
  const { data, error: readError } = await supabaseAdmin
    .from("event_registrations")
    .select("id,status,email_sent_at")
    .eq("stripe_checkout_session_id", session.id)
    .single();
  if (readError) throw new Error("Ticket could not be loaded");
  return data as { id: string; status: string; email_sent_at: string | null };
}
