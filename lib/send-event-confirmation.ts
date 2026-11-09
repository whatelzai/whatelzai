import "server-only";
import type Stripe from "stripe";
import { supabaseAdmin } from "./supabase-server";
import { mapConfirmation } from "./event-confirmation";

export async function sendEventConfirmation(session: Stripe.Checkout.Session) {
  const message = mapConfirmation(session);
  if (!message) return false;
  // Session identity deduplicates completed + async-success and later retries.
  const { data, error } = await supabaseAdmin.from("webhook_events_log")
    .select("processed_ok").eq("stripe_event_id", message.key).maybeSingle();
  if (error) throw new Error("Confirmation delivery lookup failed");
  if (data?.processed_ok) return true;
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EVENT_CONFIRMATION_FROM;
  if (!key || !from) throw new Error("Event confirmation email is not configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": message.key },
    body: JSON.stringify({ from, to: message.to, subject: message.subject, text: message.text }),
  });
  if (!response.ok) throw new Error(`Confirmation email provider returned ${response.status}`);
  const { error: saveError } = await supabaseAdmin.from("webhook_events_log").upsert({
    stripe_event_id: message.key, event_type: "map.confirmation.sent", processed_ok: true, error_msg: null,
  }, { onConflict: "stripe_event_id" });
  if (saveError) throw new Error("Confirmation delivery receipt could not be saved");
  return true;
}
