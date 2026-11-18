import { randomBytes } from "node:crypto";
import { feedbackCodeInput } from "@/lib/event-feedback/questions";
import { feedbackBody, feedbackJson as json } from "@/lib/event-feedback/http";
import { feedbackHash, openFeedbackEvent } from "@/lib/event-feedback/server";
import { supabaseAdmin as db } from "@/lib/supabase-server";
export const runtime = "nodejs";
export async function POST(req: Request) {
  const parsed = await feedbackBody(req);
  if ("response" in parsed) return parsed.response;
  const input = feedbackCodeInput.safeParse(parsed.body);
  if (!input.success)
    return json({ error: "Enter the six-digit code from your email." }, 400);
  try {
    const event = await openFeedbackEvent(input.data.eventId);
    if (!event)
      return json({ error: "Feedback is not open for this event." }, 409);
    const token = randomBytes(32).toString("hex");
    const r = await db.rpc("verify_event_feedback_code", {
      p_id: input.data.verificationId,
      p_event: event.recordId,
      p_code_hash: feedbackHash(
        `code:${input.data.verificationId}:${input.data.code}`,
      ),
      p_token_hash: feedbackHash(`token:${token}`),
    });
    if (r.error) throw r.error;
    if (r.data !== true)
      return json(
        {
          error:
            "The code is incorrect or expired. Request a new code if needed.",
        },
        400,
      );
    return json({ token });
  } catch {
    return json(
      { error: "Email verification is unavailable. Please try again." },
      503,
    );
  }
}
