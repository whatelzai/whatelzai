import { NextRequest, NextResponse } from "next/server";
import { RETURN_OFFER_COOKIE } from "@/lib/event-return-offer/model";
import { loadReturnOffer } from "@/lib/event-return-offer/server";
import { signupHash } from "@/lib/platform-event-registration";
import { supabaseAdmin as db } from "@/lib/supabase-server";
import { loadPublicEvents } from "@/lib/public-events/catalog-server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function POST(req: NextRequest) {
  if (
    req.headers.get("origin") !== req.nextUrl.origin ||
    !req.headers.get("content-type")?.startsWith("application/json")
  )
    return json({ error: "Use the feedback thank-you page." }, 403);
  if (!checkRateLimit(`return-offer:${getClientIp(req)}`).allowed)
    return json({ error: "Please try again shortly." }, 429);
  try {
    const text = await req.text();
    if (text.length > 128) return json({ error: "Invalid request." }, 400);
    const body = JSON.parse(text);
    if (!["claim", "dismiss"].includes(body.action))
      return json({ error: "Invalid request." }, 400);
    const token = req.cookies.get(RETURN_OFFER_COOKIE)?.value;
    const offer = await loadReturnOffer(token);
    if (!offer || !token || body.offerId !== offer.id)
      return json(
        {
          error:
            "This offer has ended. You can still book at the standard price.",
        },
        409,
      );
    if (body.action === "dismiss") {
      const r = await db
        .from("event_return_offers")
        .update({ dismissed_at: new Date().toISOString() })
        .eq("id", offer.id)
        .is("claimed_at", null);
      if (r.error) throw Error("Offer unavailable");
      return json({ ok: true });
    }
    const target = (await loadPublicEvents()).find(
      (e) => e.recordId === offer.target_event_id && e.registrationUrl,
    );
    if (!target) return json({ error: "Registration is not available." }, 409);
    const r = await db.rpc("claim_event_return_offer", {
      p_token_hash: signupHash(token),
    });
    if (r.error)
      return json(
        {
          error:
            "This offer has ended. You can still book at the standard price.",
        },
        409,
      );
    return json({ registrationUrl: `${target.registrationUrl}&offer=rejoin` });
  } catch {
    return json(
      { error: "We couldn’t open your offer. Please try again." },
      503,
    );
  }
}
