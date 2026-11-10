import { NextRequest, NextResponse } from "next/server";
import {
  platformRegistrationEnabled,
  signupHash,
} from "@/lib/platform-event-registration";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { mapEvent, isMapRegistrationOpen } from "@/lib/public-events/map";
export const runtime = "nodejs";
const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function POST(req: NextRequest) {
  if (!platformRegistrationEnabled() || !isMapRegistrationOpen())
    return reply({ error: "Registration is not available." }, 503);
  if (req.headers.get("origin") !== req.nextUrl.origin)
    return reply({ error: "Use the registration page." }, 403);
  if (!checkRateLimit(`event-promo:${getClientIp(req)}`).allowed)
    return reply({ error: "Please try again in a moment." }, 429);
  let code = "";
  try {
    const text = await req.text();
    if (text.length > 256) return reply({ error: "Code too long." }, 400);
    const data = JSON.parse(text);
    if (typeof data.code === "string") code = data.code.trim().toUpperCase();
  } catch {
    return reply({ error: "Enter a promo code." }, 400);
  }
  if (!/^[A-Z0-9_-]{4,64}$/.test(code))
    return reply({ error: "This code is invalid." }, 400);
  const { data: allowed, error: rateError } = await supabaseAdmin.rpc(
    "consume_event_signup_limit",
    {
      p_key: signupHash(
        `promo:${new Date().toISOString().slice(0, 10)}:${getClientIp(req)}`,
      ),
    },
  );
  if (rateError || !allowed)
    return reply({ error: "Please try again later." }, 429);
  const hash = signupHash(code);
  const { data, error } = await supabaseAdmin
    .from("event_signup_codes")
    .select("max_uses")
    .eq("event_key", mapEvent.key)
    .eq("code_hash", hash)
    .eq("enabled", true)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error)
    return reply({ error: "Unable to check the code. Please try again." }, 503);
  if (!data)
    return reply(
      { error: "This code is invalid or no longer available." },
      409,
    );
  const { count, error: countError } = await supabaseAdmin
    .from("event_signup_attempts")
    .select("id", { head: true, count: "exact" })
    .eq("event_key", mapEvent.key)
    .eq("code_hash", hash)
    .in("state", ["reserved", "checkout", "confirmed"]);
  if (countError)
    return reply({ error: "Unable to check the code. Please try again." }, 503);
  if ((count ?? 0) >= data.max_uses)
    return reply({ error: "This code has reached its limit." }, 409);
  return reply({ free: true });
}
