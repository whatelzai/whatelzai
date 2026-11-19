import { NextResponse } from "next/server";
import { eventStaff } from "@/lib/event-staff";
import { parseTicket } from "@/lib/event-checkin-policy";
import { supabaseAdmin } from "@/lib/supabase-server";
import { EVENT_KEY } from "@/lib/event-tickets";
export async function POST(req: Request) {
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const user = await eventStaff();
  if (!user)
    return NextResponse.json(
      { error: "Event staff sign-in required" },
      { status: 403 },
    );
  let input;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid ticket" }, { status: 400 });
  }
  const id =
    input && typeof input.ticket === "string"
      ? parseTicket(input.ticket)
      : null;
  if (!id)
    return NextResponse.json({ error: "Invalid ticket" }, { status: 400 });
  const { data, error } = await supabaseAdmin
    .from("event_registrations")
    .update({ checked_in_at: new Date().toISOString(), checked_in_by: user.id })
    .eq("id", id)
    .eq("event_key", EVENT_KEY)
    .eq("status", "confirmed")
    .is("checked_in_at", null)
    .select("attendee_name,checked_in_at")
    .maybeSingle();
  if (error)
    return NextResponse.json(
      { error: "Check-in failed. Please retry." },
      { status: 500 },
    );
  if (data)
    return NextResponse.json({
      status: "checked_in",
      name: data.attendee_name,
      at: data.checked_in_at,
    });
  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("event_registrations")
    .select("status,attendee_name,checked_in_at")
    .eq("id", id)
    .eq("event_key", EVENT_KEY)
    .maybeSingle();
  if (lookupError)
    return NextResponse.json(
      { error: "Ticket lookup failed" },
      { status: 500 },
    );
  if (!existing || existing.status !== "confirmed")
    return NextResponse.json(
      { error: "Ticket invalid or cancelled" },
      { status: 404 },
    );
  if (!existing.checked_in_at)
    return NextResponse.json(
      { error: "Ticket changed. Please try again." },
      { status: 409 },
    );
  return NextResponse.json({
    status: "already_checked_in",
    name: existing.attendee_name,
    at: existing.checked_in_at,
  });
}
