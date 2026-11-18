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
export async function matchesEventRegistration(
  eventKey: string,
  email: string,
) {
  const result = await db
    .from("event_registrations")
    .select("id")
    .eq("event_key", eventKey)
    .eq("status", "confirmed")
    .eq("email", email)
    .limit(1);
  if (result.error) throw Error("Registration check unavailable");
  return !!result.data?.length;
}
