import { feedbackEmailInput } from "@/lib/event-feedback/questions";
import { feedbackBody, feedbackJson as json } from "@/lib/event-feedback/http";
import {
  openFeedbackEvent,
  matchesEventRegistration,
} from "@/lib/event-feedback/server";
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
    if (!event?.key)
      return json({ error: "Feedback is not open for this event." }, 409);
    const matched = await matchesEventRegistration(event.key, input.data.email);
    // Return only a match for the supplied address, never attendee details or a directory.
    return json({ matched });
  } catch {
    return json(
      { error: "We couldn’t check your email. Please try again." },
      503,
    );
  }
}
