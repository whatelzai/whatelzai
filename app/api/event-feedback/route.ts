import { createHmac } from "node:crypto";
import { eventFeedbackInput, feedbackOpen } from "@/lib/event-feedback/model";
import {
  loadPublicEvents,
  publicEventNow,
} from "@/lib/public-events/catalog-server";
import { resolveEvent } from "@/lib/public-events/catalog";
import { supabaseAdmin as db } from "@/lib/supabase-server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
export const runtime = "nodejs";
const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function POST(req: Request) {
  if (
    req.headers.get("origin") !== new URL(req.url).origin ||
    !req.headers.get("content-type")?.startsWith("application/json")
  )
    return json(
      { error: "Please use the feedback form on this website." },
      403,
    );
  if (!checkRateLimit(`event-feedback:${getClientIp(req)}`).allowed)
    return json({ error: "Please wait a moment before trying again." }, 429);
  if (Number(req.headers.get("content-length") ?? 0) > 8000)
    return json({ error: "Feedback is too long." }, 413);
  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > 8000)
    return json({ error: "Feedback is too long." }, 413);
  let input;
  try {
    input = eventFeedbackInput.safeParse(JSON.parse(raw));
  } catch {
    return json({ error: "Please check your feedback." }, 400);
  }
  if (!input.success)
    return json(
      {
        error: "Choose a rating and keep your comment under 1,500 characters.",
      },
      400,
    );
  try {
    const event = resolveEvent(await loadPublicEvents(), input.data.eventId);
    if (!event || !feedbackOpen(event, publicEventNow()))
      return json({ error: "Feedback is not open for this event." }, 409);
    const secret =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    if (!secret) throw Error("Missing server configuration");
    const clientHash = createHmac("sha256", secret)
      .update(`${new Date().toISOString().slice(0, 10)}:${getClientIp(req)}`)
      .digest("hex");
    const { error } = await db.rpc("submit_event_feedback", {
      p_id: input.data.requestId,
      p_event: event.recordId,
      p_rating: input.data.rating,
      p_comment: input.data.comment,
      p_client_hash: clientHash,
    });
    if (error) {
      if (error.message.includes("FEEDBACK_RATE_LIMIT"))
        return json({ error: "Please try again later." }, 429);
      if (error.message.includes("FEEDBACK_CONFLICT"))
        return json(
          {
            error:
              "This response was already submitted. Refresh to start again.",
          },
          409,
        );
      throw error;
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
