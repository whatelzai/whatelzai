import { paymentFreezeUntil } from "@/lib/event-registration-policy";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  signupHash,
  fulfillPlatformSession,
  releasePlatformSession,
  finishPlatformSignup,
  type SignupAttempt,
} from "@/lib/platform-event-registration";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getStripe } from "@/lib/stripe-server";
import { getClientIp, checkTokenRateLimit } from "@/lib/rate-limit";
export const runtime = "nodejs";
const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function POST(req: NextRequest) {
  if (req.headers.get("origin") !== req.nextUrl.origin)
    return reply({ error: "Use the registration page." }, 403);
  let body: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > 512) return reply({ error: "Invalid request." }, 400);
    body = JSON.parse(text);
  } catch {
    return reply({ error: "Invalid request." }, 400);
  }
  if (!body || typeof body !== "object")
    return reply({ error: "Invalid request." }, 400);
  if (body.reset === true) {
    const result = reply({ state: "unknown" });
    result.cookies.set("whatelz_event_signup", "", { path: "/", maxAge: 0 });
    return result;
  }
  const token =
    body.requestToken || req.cookies.get("whatelz_event_signup")?.value;
  if (!z.uuid().safeParse(token).success) return reply({ state: "unknown" });
  const hash = signupHash(token as string);
  if (!checkTokenRateLimit(`event-status:${hash}`, getClientIp(req)).allowed)
    return reply({ error: "Please wait a moment." }, 429);
  const { data, error } = await supabaseAdmin
    .from("event_signup_attempts")
    .select("*")
    .eq("request_hash", hash)
    .maybeSingle();
  if (error) return reply({ error: "Unable to check registration." }, 503);
  if (!data) return reply({ state: "unknown" });
  const attempt = data as SignupAttempt & { payment_started_at: string | null };
  const lockUntil = paymentFreezeUntil(attempt.payment_started_at);
  try {
    if (attempt.state === "confirmed") {
      const { data: ticket, error: ticketError } = await supabaseAdmin
        .from("event_registrations")
        .select("status")
        .eq("signup_attempt_id", attempt.id)
        .single();
      if (ticketError) throw Error("Ticket status unavailable");
      return reply({
        state: ticket.status === "cancelled" ? "cancelled" : "confirmed",
      });
    }
    if (attempt.state === "released") return reply({ state: "expired" });
    if (
      body.checkPayment === true &&
      Date.now() >= lockUntil &&
      attempt.stripe_session_id
    ) {
      const session = await getStripe().checkout.sessions.retrieve(
        attempt.stripe_session_id,
      );
      if (session.status === "complete" && session.payment_status === "paid") {
        await fulfillPlatformSession(session);
        return reply({ state: "confirmed" });
      }
      if (session.status === "expired") {
        await releasePlatformSession(session);
        return reply({ state: "expired" });
      }
      if (session.status === "open")
        return reply({ state: "pending", lockUntil, resumeUrl: session.url });
    }
    if (attempt.amount === 0 && body.checkPayment === true) {
      await finishPlatformSignup(attempt, null);
      return reply({ state: "confirmed" });
    }
    return reply({ state: "pending", lockUntil });
  } catch {
    return reply(
      {
        error:
          "Payment confirmation is still being checked. Please try again later.",
      },
      503,
    );
  }
}
