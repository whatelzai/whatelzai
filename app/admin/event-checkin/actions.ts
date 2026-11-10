"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/users";
import { supabaseAdmin } from "@/lib/supabase-server";
import { EVENT_KEY } from "@/lib/event-tickets";
export async function grantEventStaff(form: FormData) {
  await requireAdmin();
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email || email.length > 254)
    throw new Error("Enter a valid account email");
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (error || !user)
    throw new Error(
      "Ask this person to sign in to Whatelz first, then try again",
    );
  const { error: grantError } = await supabaseAdmin.from("event_staff").upsert(
    {
      event_key: EVENT_KEY,
      user_id: user.id,
      granted_by: process.env.WHATELZ_OWNER_USER_ID!,
    },
    { onConflict: "event_key,user_id" },
  );
  if (grantError) throw new Error("Event staff could not be saved");
  revalidatePath("/admin/event-checkin");
}
export async function revokeEventStaff(form: FormData) {
  await requireAdmin();
  const id = String(form.get("user_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid account");
  const { error } = await supabaseAdmin
    .from("event_staff")
    .delete()
    .eq("event_key", EVENT_KEY)
    .eq("user_id", id);
  if (error) throw new Error("Event staff could not be removed");
  revalidatePath("/admin/event-checkin");
}

export async function saveEventPromo(form: FormData) {
  await requireAdmin();
  const { createHash } = await import("node:crypto");
  const code = String(form.get("code") ?? "")
    .trim()
    .toUpperCase();
  const max = Number(form.get("max_uses"));
  if (
    !/^[A-Z0-9_-]{4,64}$/.test(code) ||
    !Number.isInteger(max) ||
    max < 1 ||
    max > 20
  )
    throw Error("Enter a code and a limit from 1 to 20.");
  const { error } = await supabaseAdmin.from("event_signup_codes").upsert(
    {
      event_key: EVENT_KEY,
      code_hash: createHash("sha256").update(code).digest("hex"),
      max_uses: max,
      enabled: form.get("enabled") === "on",
      expires_at: "2026-11-12T11:30:00Z",
    },
    { onConflict: "event_key,code_hash" },
  );
  if (error) throw Error("Promo could not be saved.");
  revalidatePath("/admin/event-checkin");
}

// Cutover utility, scoped to the two known November12 Payment Links. Disable
// those links in Stripe first. Completed tickets and other products are untouched.
export async function closeLegacyEventCheckouts() {
  await requireAdmin();
  const { getStripe } = await import("@/lib/stripe-server");
  const { MAP_PAYMENT_LINK, LEGACY_MAP_PAYMENT_LINK } =
    await import("@/lib/event-confirmation");
  const stripe = getStripe();
  for (const link of [MAP_PAYMENT_LINK, LEGACY_MAP_PAYMENT_LINK]) {
    for await (const session of stripe.checkout.sessions.list({
      payment_link: link,
      status: "open",
      limit: 100,
    })) {
      if (
        session.mode === "payment" &&
        session.payment_link === link &&
        session.status === "open"
      )
        await stripe.checkout.sessions.expire(session.id);
    }
  }
  revalidatePath("/admin/event-checkin");
}

export async function retryEventTicketEmail(form: FormData) {
  await requireAdmin();
  const id = String(form.get("ticket_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw Error("Invalid ticket.");
  const { data, error } = await supabaseAdmin
    .from("event_registrations")
    .select("id,signup_attempt_id,stripe_checkout_session_id")
    .eq("id", id)
    .eq("event_key", EVENT_KEY)
    .eq("status", "confirmed")
    .single();
  if (error || !data) throw Error("Confirmed ticket not found.");
  const deliveryId = data.signup_attempt_id
    ? `platform/${data.signup_attempt_id}`
    : data.stripe_checkout_session_id;
  if (!deliveryId) throw Error("Ticket delivery reference missing.");
  const { sendStoredEventTicket } =
    await import("@/lib/send-event-confirmation");
  await sendStoredEventTicket(data.id, deliveryId);
  revalidatePath("/admin/event-checkin");
}
