import {
  verifiedFeedbackInput,
  validFeedbackAnswers,
} from "@/lib/event-feedback/questions";
import { feedbackBody, feedbackJson as json } from "@/lib/event-feedback/http";
import {
  feedbackHash,
  openFeedbackEvent,
  loadFeedbackForm,
} from "@/lib/event-feedback/server";
import { supabaseAdmin as db } from "@/lib/supabase-server";
import { getClientIp } from "@/lib/rate-limit";
export const runtime = "nodejs";
export async function POST(req: Request) {
  const parsed = await feedbackBody(req, true);
  if ("response" in parsed) return parsed.response;
  const input = verifiedFeedbackInput.safeParse(parsed.body);
  if (!input.success)
    return json(
      {
        error:
          "Please refresh this form, verify your registration email and answer every question.",
      },
      400,
    );
  try {
    const event = await openFeedbackEvent(input.data.eventId);
    if (!event)
      return json({ error: "Feedback is not open for this event." }, 409);
    const form = await loadFeedbackForm(event.recordId);
    if (
      !form ||
      form.id !== input.data.formId ||
      !validFeedbackAnswers(form, input.data.answers)
    )
      return json({ error: "Please answer every question on this form." }, 400);
    const r = await db.rpc("submit_verified_event_feedback", {
      p_id: input.data.requestId,
      p_event: event.recordId,
      p_verification: input.data.verificationId,
      p_token_hash: feedbackHash(`token:${input.data.token}`),
      p_form: form.id,
      p_answers: input.data.answers,
      p_client_hash: feedbackHash(
        `client:${new Date().toISOString().slice(0, 10)}:${getClientIp(req)}`,
      ),
    });
    if (r.error) {
      const message = r.error.message;
      if (message.includes("FEEDBACK_VERIFICATION_REQUIRED"))
        return json(
          {
            error: "Your email verification has expired. Please verify again.",
          },
          401,
        );
      if (message.includes("FEEDBACK_ALREADY_SUBMITTED"))
        return json(
          { error: "You have already submitted feedback for this event." },
          409,
        );
      if (message.includes("FEEDBACK_CONFLICT"))
        return json(
          {
            error:
              "This response has already been saved. Refresh to start again.",
          },
          409,
        );
      throw r.error;
    }
    return json({ ok: true });
  } catch {
    return json(
      {
        error:
          "Your feedback could not be saved. Please try again; your answers are still here.",
      },
      503,
    );
  }
}
