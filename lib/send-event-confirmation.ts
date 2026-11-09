import "server-only";
import type Stripe from "stripe";
import QRCode from "qrcode";
import { ensureEventTicket, ticketUrl } from "./event-tickets";
import { supabaseAdmin } from "./supabase-server";
import { mapConfirmation } from "./event-confirmation";

export async function sendEventConfirmation(session: Stripe.Checkout.Session) {
  const message = mapConfirmation(session);
  if (!message) return false;
  const ticket = await ensureEventTicket(session);
  if (!ticket || ticket.status !== "confirmed") return true;
  if (ticket.email_sent_at) return true;
  // Session identity deduplicates completed + async-success and later retries.
  const { data, error } = await supabaseAdmin
    .from("webhook_events_log")
    .select("processed_ok")
    .eq("stripe_event_id", message.key)
    .maybeSingle();
  if (error) throw new Error("Confirmation delivery lookup failed");
  // An earlier email without a QR must be resent with its new ticket.
  if (data?.processed_ok && ticket.email_sent_at) return true;
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EVENT_CONFIRMATION_FROM;
  if (!key || !from)
    throw new Error("Event confirmation email is not configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `qr-ticket/${session.id}`,
    },
    body: JSON.stringify({
      from,
      to: message.to,
      subject: message.subject,
      text: `${message.text}\n\nYour ticket: ${ticketUrl(ticket.id)}\nShow this QR ticket at the door. Keep it private; each ticket admits one person.`,
      attachments: [
        {
          filename: "event-ticket.png",
          content: (
            await QRCode.toBuffer(ticketUrl(ticket.id), {
              width: 600,
              margin: 4,
            })
          ).toString("base64"),
          content_type: "image/png",
        },
      ],
    }),
  });
  if (!response.ok)
    throw new Error(`Confirmation email provider returned ${response.status}`);
  const { error: ticketError } = await supabaseAdmin
    .from("event_registrations")
    .update({ email_sent_at: new Date().toISOString() })
    .eq("id", ticket.id);
  if (ticketError) throw new Error("Ticket email receipt could not be saved");
  const { error: saveError } = await supabaseAdmin
    .from("webhook_events_log")
    .upsert(
      {
        stripe_event_id: message.key,
        event_type: "map.confirmation.sent",
        processed_ok: true,
        error_msg: null,
      },
      { onConflict: "stripe_event_id" },
    );
  if (saveError)
    throw new Error("Confirmation delivery receipt could not be saved");
  return true;
}
