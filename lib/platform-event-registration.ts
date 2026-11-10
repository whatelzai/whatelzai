import "server-only";
import { createHash } from "node:crypto";
import type Stripe from "stripe";
import { supabaseAdmin } from "./supabase-server";
import { getStripe } from "./stripe-server";
import {
  PLATFORM_EVENT_MARKER,
  platformSessionMatches,
  platformCheckoutParams,
} from "./event-registration-policy";
import { sendStoredEventTicket } from "./send-event-confirmation";
export const platformRegistrationEnabled = () =>
  process.env.EVENT_PLATFORM_REGISTRATION_ENABLED === "true";
export const signupHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export type SignupAttempt = {
  id: string;
  request_hash: string;
  event_key: string;
  attendee_name: string;
  email: string;
  phone: string;
  amount: number;
  state: string;
  stripe_session_id: string | null;
  created_at: string;
};
export async function finishPlatformSignup(
  attempt: SignupAttempt,
  session: Stripe.Checkout.Session | null,
) {
  const { data, error } = await supabaseAdmin.rpc("confirm_event_signup", {
    p_attempt: attempt.id,
    p_session: session?.id ?? null,
    p_payment_intent:
      typeof session?.payment_intent === "string"
        ? session.payment_intent
        : null,
  });
  if (error || !data) throw Error("Ticket confirmation could not be saved");
  await sendStoredEventTicket(data, `platform/${attempt.id}`);
}
export async function fulfillPlatformSession(
  session: Stripe.Checkout.Session,
): Promise<boolean> {
  if (session.metadata?.whatelz_event_id !== PLATFORM_EVENT_MARKER)
    return false;
  if (!platformSessionMatches(session)) {
    if (session.status === "complete" && session.payment_status === "unpaid")
      return true;
    throw Error("Event payment does not match its registration");
  }
  const { data, error } = await supabaseAdmin
    .from("event_signup_attempts")
    .select("*")
    .eq("id", session.client_reference_id!)
    .maybeSingle();
  if (
    error ||
    !data ||
    data.amount !== 700 ||
    data.stripe_session_id !== session.id
  )
    throw Error("Event payment registration mismatch");
  await finishPlatformSignup(data as SignupAttempt, session);
  return true;
}
export async function releasePlatformSession(
  session: Stripe.Checkout.Session,
  failed = false,
) {
  if (session.metadata?.whatelz_event_id !== PLATFORM_EVENT_MARKER) return;
  if (
    session.status !== "expired" &&
    !(
      failed &&
      session.status === "complete" &&
      session.payment_status === "unpaid"
    )
  )
    return;
  const { error } = await supabaseAdmin
    .from("event_signup_attempts")
    .update({ state: "released" })
    .eq("stripe_session_id", session.id)
    .eq("state", "checkout");
  if (error) throw Error("Expired event reservation could not be released");
}
export async function checkoutForAttempt(
  attempt: SignupAttempt,
  origin: string,
) {
  const stripe = getStripe();
  if (attempt.stripe_session_id) {
    const existing = await stripe.checkout.sessions.retrieve(
      attempt.stripe_session_id,
    );
    if (existing.status === "complete") {
      if (existing.payment_status !== "paid")
        throw Error(
          "Payment is still processing. Please check your email later.",
        );
      await fulfillPlatformSession(existing);
      return null;
    }
    if (existing.status === "expired") {
      await releasePlatformSession(existing);
      throw Error("This checkout expired. Please start again.");
    }
    return existing.url;
  }
  const session = await stripe.checkout.sessions.create(
    platformCheckoutParams(attempt, origin),
    { idempotencyKey: `event-signup/${attempt.id}` },
  );
  const { error } = await supabaseAdmin
    .from("event_signup_attempts")
    .update({
      stripe_session_id: session.id,
      state: "checkout",
      payment_started_at: new Date().toISOString(),
    })
    .eq("id", attempt.id)
    .eq("state", "reserved");
  if (error)
    throw Error(
      "Checkout could not be linked; please retry with the same details",
    );
  if (session.status === "expired") {
    await releasePlatformSession(session);
    throw Error("This checkout expired. Please start again.");
  }
  return session.url;
}
