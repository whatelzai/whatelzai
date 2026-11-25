import { loadReturnOffer } from "@/lib/event-return-offer/server";
import { RETURN_OFFER_COOKIE } from "@/lib/event-return-offer/model";
import { configForReservedAttempt } from "@/lib/event-registration-policy";
import { loadPublicEvents } from "@/lib/public-events/catalog-server";
import { resolveEvent } from "@/lib/public-events/catalog";
import { registrationCookie } from "@/lib/public-events/map";
import {
  checkoutConfigForMarker as loadCheckoutConfigForInvitation,
  loadCheckoutConfig,
} from "@/lib/event-offer";
import { NextRequest, NextResponse } from "next/server";
import { eventRegistrationSchema } from "@/lib/event-registration-policy";
import {
  checkoutForAttempt,
  finishPlatformSignup,
  platformRegistrationEnabled,
  signupHash,
  type SignupAttempt,
} from "@/lib/platform-event-registration";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase-server";
export const runtime = "nodejs";
const response = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function POST(req: NextRequest) {
  if (!platformRegistrationEnabled())
    return response({ error: "Registration is not available here yet." }, 503);
  if (req.headers.get("origin") !== req.nextUrl.origin)
    return response({ error: "Please register from this website." }, 403);
  if (!checkRateLimit(`event-registration:${getClientIp(req)}`).allowed)
    return response(
      { error: "Please wait a moment before trying again." },
      429,
    );
  if (Number(req.headers.get("content-length") ?? 0) > 4096)
    return response({ error: "Form too large." }, 413);
  let raw;
  try {
    const text = await req.text();
    if (text.length > 4096) return response({ error: "Form too large." }, 413);
    raw = JSON.parse(text);
  } catch {
    return response({ error: "Please check your details." }, 400);
  }
  if (
    raw?.returnOffer === true &&
    raw.name === undefined &&
    raw.phone === undefined
  ) {
    const grant = await loadReturnOffer(
      req.cookies.get(RETURN_OFFER_COOKIE)?.value,
    );
    if (!grant?.claimed_at || grant.email !== raw.email)
      return response(
        { error: "Your return offer has expired.", offerExpired: true },
        409,
      );
    const { data: feedback } = await supabaseAdmin
      .from("event_feedback")
      .select("registration_id")
      .eq("id", grant.feedback_id)
      .maybeSingle();
    const { data: previous } =
      (feedback &&
        (await supabaseAdmin
          .from("event_registrations")
          .select("attendee_name,phone")
          .eq("id", feedback.registration_id)
          .eq("status", "confirmed")
          .maybeSingle())) ||
      {};
    if (!previous?.attendee_name || !previous.phone)
      return response(
        {
          error: "Please complete your missing registration details.",
          needsDetails: true,
        },
        409,
      );
    raw.name = previous.attendee_name;
    raw.phone = previous.phone;
  }
  if (raw?.personalInvitation === true) {
    const email =
      typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
    if (
      !email ||
      email.length > 254 ||
      typeof raw.code !== "string" ||
      !/^[A-F0-9]{20}$/.test(raw.code) ||
      typeof raw.eventId !== "string" ||
      raw.returnOffer
    )
      return response(
        { error: "Please use the email registered for this invitation." },
        409,
      );
    const config = await loadCheckoutConfigForInvitation(raw.eventId);
    if (!config) return response({ error: "Invitation unavailable." }, 409);
    const { data: code, error: codeError } = await supabaseAdmin
      .from("event_signup_codes")
      .select("recipient_email")
      .eq("event_key", config.eventKey)
      .eq("code_hash", signupHash(raw.code))
      .eq("recipient_email", email)
      .eq("enabled", true)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (codeError) return response({ error: "Please try again shortly." }, 503);
    if (!code)
      return response(
        { error: "Please use the email registered for this invitation." },
        409,
      );
    const { data: previous, error: detailsError } = await supabaseAdmin
      .from("event_registrations")
      .select("attendee_name,phone")
      .eq("email", email)
      .eq("status", "confirmed")
      .eq("is_test", false)
      .not("checked_in_at", "is", null)
      .order("checked_in_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (detailsError || !previous?.attendee_name || !previous.phone)
      return response(
        {
          error:
            "Your saved attendee details are unavailable. Please contact Edmund.",
        },
        409,
      );
    raw.name = previous.attendee_name;
    raw.phone = previous.phone;
  }
  const parsed = eventRegistrationSchema.safeParse(raw);
  if (!parsed.success)
    return response(
      { error: "Enter your name, a valid email and phone number." },
      400,
    );
  const input = parsed.data;
  if (input.code.toUpperCase() === "REJOIN")
    return response(
      {
        error:
          "REJOIN is applied automatically through your eligible feedback offer.",
      },
      409,
    );
  let event, config;
  try {
    event = resolveEvent(await loadPublicEvents(), input.eventId);
    config = event?.key ? await loadCheckoutConfig(event.key) : null;
  } catch {
    return response({ error: "Registration is temporarily unavailable." }, 503);
  }
  if (!event?.registrationUrl || !config || config.amount !== event.priceMinor)
    return response({ error: "Registration is not open for this event." }, 409);
  const { data: withinLimit, error: limitError } = await supabaseAdmin.rpc(
    "consume_event_signup_limit",
    {
      p_key: signupHash(
        `${new Date().toISOString().slice(0, 10)}:${getClientIp(req)}`,
      ),
    },
  );
  if (limitError || !withinLimit)
    return response({ error: "Please try again later." }, 429);

  try {
    if (input.returnOffer && input.code)
      return response({ error: "Offers cannot be combined." }, 409);
    const token = req.cookies.get(RETURN_OFFER_COOKIE)?.value;
    const baseArgs = {
      p_event_key: event.key,
      p_request_hash: signupHash(input.requestToken),
      p_name: input.name,
      p_email: input.email,
      p_phone: input.phone,
    };
    let codeHash = input.code ? signupHash(input.code.toUpperCase()) : null;
    if (input.code === "EMAIL-OFFER") {
      const lookup = await supabaseAdmin
        .from("event_signup_codes")
        .select("code_hash")
        .eq("event_key", event.key)
        .eq("recipient_email", input.email.trim().toLowerCase())
        .eq("enabled", true)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (lookup.error)
        return response({ error: "Offer check unavailable." }, 503);
      if (!lookup.data)
        return response({ error: "Your offer is no longer available." }, 409);
      codeHash = lookup.data.code_hash;
    }
    const { data, error } = input.returnOffer
      ? await supabaseAdmin.rpc("reserve_event_signup_with_return", {
          ...baseArgs,
          p_token_hash:
            token && /^[a-f0-9]{64}$/.test(token) ? signupHash(token) : null,
        })
      : await supabaseAdmin.rpc("reserve_event_signup_for_event", {
          ...baseArgs,
          p_code_hash: codeHash,
        });
    if (error) {
      const messages: Record<string, string> = {
        RETURN_OFFER_EXPIRED:
          "Your REJOIN offer has ended. Continue with the standard ticket price.",
        RETURN_OFFER_MISMATCH:
          "REJOIN is only available for the email tied to this feedback offer.",
        INVALID_CODE: "This promo code is invalid or no longer available.",
        EVENT_FULL: "This event is full.",
        REGISTRATION_CLOSED: "Registration has closed.",
        ALREADY_REGISTERED:
          "If you already registered, check your inbox for your ticket.",
        REGISTRATION_PENDING:
          "A registration is already in progress for this email. Use the original checkout or contact Edmund.",
        TOO_MANY_REQUESTS: "Please try again later.",
      };
      const key = Object.keys(messages).find((k) => error.message.includes(k));
      return response(
        {
          error: key
            ? messages[key]
            : "Registration could not be saved. Please try again.",
          ...(key?.startsWith("RETURN_OFFER_") ? { offerExpired: true } : {}),
        },
        409,
      );
    }
    const attempt = data as SignupAttempt;
    const matchesCode =
      (attempt.code_hash ?? null) ===
      (input.code ? signupHash(input.code.toUpperCase()) : null);
    let amountMatches = matchesCode && !!input.code && attempt.amount === 0;
    if (matchesCode && !amountMatches) {
      try {
        configForReservedAttempt(config, attempt);
        amountMatches = true;
      } catch {
        /* Reject any amount without an authorized saved reservation. */
      }
    }

    if (
      attempt.event_key !== event.key ||
      attempt.email !== input.email ||
      attempt.attendee_name !== input.name ||
      attempt.phone !== input.phone ||
      !amountMatches
    )
      return response(
        {
          error:
            "Use the same details to resume registration, or start a new form.",
        },
        409,
      );
    if (attempt.state === "released")
      return response(
        { error: "This registration expired. Start a new form." },
        409,
      );
    if (attempt.amount === 0) {
      await finishPlatformSignup(attempt, null);
      const result = response({ confirmed: true });
      result.cookies.set(registrationCookie(event), input.requestToken, {
        httpOnly: true,
        secure: req.nextUrl.protocol === "https:",
        sameSite: "lax",
        path: "/",
        maxAge: 86400,
      });
      return result;
    }
    const url = await checkoutForAttempt(attempt, req.nextUrl.origin);
    const result = response(url ? { checkoutUrl: url } : { confirmed: true });
    result.cookies.set(registrationCookie(event), input.requestToken, {
      httpOnly: true,
      secure: req.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: 86400,
    });
    return result;
  } catch {
    return response(
      {
        error:
          "We could not finish registration. Retry with the same details; if you paid, your place will be confirmed by email.",
      },
      503,
    );
  }
}
