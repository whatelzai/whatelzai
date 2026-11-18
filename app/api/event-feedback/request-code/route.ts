import { randomInt, randomUUID } from "node:crypto";
import { after } from "next/server";
import { feedbackEmailInput } from "@/lib/event-feedback/questions";
import { feedbackBody, feedbackJson as json } from "@/lib/event-feedback/http";
import {
  feedbackHash,
  openFeedbackEvent,
  sendFeedbackCode,
} from "@/lib/event-feedback/server";
import { supabaseAdmin as db } from "@/lib/supabase-server";
import { getClientIp } from "@/lib/rate-limit";
export const runtime = "nodejs";
export async function POST(req: Request) {
  const parsed = await feedbackBody(req);
  if ("response" in parsed) return parsed.response;
  const input = feedbackEmailInput.safeParse(parsed.body);
  if (!input.success)
    return json(
      { error: "Enter the email address you used to register." },
      400,
    );
  try {
    const event = await openFeedbackEvent(input.data.eventId);
    if (!event)
      return json({ error: "Feedback is not open for this event." }, 409);
    if (!process.env.RESEND_API_KEY || !process.env.EVENT_CONFIRMATION_FROM)
      throw Error("Email unavailable");
    const r = await db
      .from("event_registrations")
      .select("id,email")
      .eq("event_key", event.key)
      .eq("status", "confirmed")
      .eq("email", input.data.email)
      .order("created_at", { ascending: true })
      .limit(1);
    if (r.error) throw r.error;
    const id = randomUUID(),
      code = String(randomInt(0, 1000000)).padStart(6, "0");
    const issued = await db.rpc("issue_event_feedback_code", {
      p_id: id,
      p_event: event.recordId,
      p_registration: r.data[0]?.id ?? null,
      p_email_hash: feedbackHash(`email:${event.recordId}:${input.data.email}`),
      p_code_hash: feedbackHash(`code:${id}:${code}`),
      p_client_hash: feedbackHash(
        `client:${new Date().toISOString().slice(0, 10)}:${getClientIp(req)}`,
      ),
    });
    if (issued.error) {
      if (issued.error.message.includes("FEEDBACK_RATE_LIMIT"))
        return json(
          { error: "Please wait before requesting another code." },
          429,
        );
      throw issued.error;
    }
    if (r.data[0])
      after(async () => {
        try {
          await sendFeedbackCode(
            r.data[0].email,
            code,
            event.title,
            event.dateLabel,
            id,
          );
        } catch {
          console.error("Event feedback code delivery failed");
        }
      });
    // Same response for registered/unregistered addresses; never return an email list or attendee identity.
    return json({
      verificationId: id,
      message:
        "If this email is registered for the event, a code is on its way. Check your inbox and spam folder.",
    });
  } catch {
    return json(
      {
        error:
          "The verification code could not be requested. Please try again.",
      },
      503,
    );
  }
}
