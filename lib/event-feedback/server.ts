import "server-only";
import { createHmac } from "node:crypto";
import { supabaseAdmin as db } from "@/lib/supabase-server";
import { feedbackFormConfig } from "./questions";
import {
  loadPublicEvents,
  publicEventNow,
} from "@/lib/public-events/catalog-server";
import { resolveEvent } from "@/lib/public-events/catalog";
import { feedbackOpen } from "./model";
export function feedbackHash(value: string) {
  const secret =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!secret) throw Error("Feedback configuration unavailable");
  return createHmac("sha256", secret)
    .update("event-feedback-v2:" + value)
    .digest("hex");
}
export async function loadFeedbackForm(recordId: string) {
  const binding = await db
    .from("event_feedback_form_bindings")
    .select("form_id")
    .eq("event_id", recordId)
    .maybeSingle();
  if (binding.error) throw Error("Feedback configuration unavailable");
  if (!binding.data) return null;
  const r = await db
    .from("event_feedback_forms")
    .select("id,title,questions,summary_question_id")
    .eq("id", binding.data.form_id)
    .single();
  if (r.error) throw Error("Feedback configuration unavailable");
  return feedbackFormConfig.parse({
    id: r.data.id,
    title: r.data.title,
    questions: r.data.questions,
    summaryQuestionId: r.data.summary_question_id,
  });
}
export async function openFeedbackEvent(id: string) {
  const event = resolveEvent(await loadPublicEvents(), id);
  return event && feedbackOpen(event, publicEventNow()) ? event : null;
}
export async function sendFeedbackCode(
  email: string,
  code: string,
  eventTitle: string,
  dateLabel: string,
  challenge: string,
) {
  const key = process.env.RESEND_API_KEY,
    from = process.env.EVENT_CONFIRMATION_FROM;
  if (!key || !from) throw Error("Feedback email unavailable");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `event-feedback/${challenge}`,
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: "Your event feedback verification code",
      text: `Your verification code is ${code}.\n\n${eventTitle}\n${dateLabel}\n\nThis code expires in 10 minutes. If you did not request it, you can ignore this email.`,
    }),
  });
  if (!r.ok) throw Error("Feedback email delivery failed");
}
