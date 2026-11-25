import { NextRequest, NextResponse } from "next/server";
import {
  platformRegistrationEnabled,
  signupHash,
} from "@/lib/platform-event-registration";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { mapEvent } from "@/lib/public-events/map";
import { loadPublicEvents } from "@/lib/public-events/catalog-server";
import { resolveEvent, type CatalogEvent } from "@/lib/public-events/catalog";
export const runtime = "nodejs";
const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function POST(req: NextRequest) {
  if (!platformRegistrationEnabled())
    return reply({ error: "Registration is not available." }, 503);
  if (req.headers.get("origin") !== req.nextUrl.origin)
    return reply({ error: "Use the registration page." }, 403);
  if (!checkRateLimit(`event-promo:${getClientIp(req)}`).allowed)
    return reply({ error: "Please try again in a moment." }, 429);
  let code = "";
  let email = "";
  let event: CatalogEvent;
  try {
    const text = await req.text();
    if (text.length > 768) return reply({ error: "Code too long." }, 400);
    const data = JSON.parse(text);
    const selected = resolveEvent(
      await loadPublicEvents(),
      data.eventId || mapEvent.id,
    );
    if (!selected || !selected.registrationUrl)
      return reply({ error: "Registration is closed." }, 409);
    event = selected;
    email =
      typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
    if (typeof data.code === "string") code = data.code.trim().toUpperCase();
  } catch {
    return reply({ error: "Enter a promo code." }, 400);
  }
  if (code === "REJOIN")
    return reply(
      {
        error:
          "REJOIN is applied automatically through an eligible attendee’s feedback offer.",
      },
      409,
    );
  const emailLookup = !code && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailLookup && !/^[A-Z0-9_-]{4,64}$/.test(code))
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
  const lookup = supabaseAdmin
    .from("event_signup_codes")
    .select("code_hash,max_uses,recipient_email,ticket_amount")
    .eq("event_key", event.key)
    .eq("enabled", true)
    .gt("expires_at", new Date().toISOString());
  const { data, error } = await (
    emailLookup
      ? lookup.eq("recipient_email", email)
      : lookup.eq("code_hash", signupHash(code))
  ).maybeSingle();
  if (error)
    return reply({ error: "Unable to check the code. Please try again." }, 503);
  if (emailLookup && !data) return reply({ eligible: false });
  if (!data || (data.recipient_email && data.recipient_email !== email))
    return reply(
      { error: "This code is invalid or no longer available." },
      409,
    );
  const { count, error: countError } = await supabaseAdmin
    .from("event_signup_attempts")
    .select("id", { head: true, count: "exact" })
    .eq("event_key", event.key)
    .eq("code_hash", data.code_hash)
    .in("state", ["reserved", "checkout", "confirmed"]);
  if (countError)
    return reply({ error: "Unable to check the code. Please try again." }, 503);
  if (emailLookup && (count ?? 0) >= data.max_uses)
    return reply({ eligible: false });
  if ((count ?? 0) >= data.max_uses)
    return reply({ error: "This code has reached its limit." }, 409);
  return reply({ free: !data.ticket_amount, amount: data.ticket_amount ?? 0 });
}
