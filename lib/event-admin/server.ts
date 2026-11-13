import "server-only";
import { supabaseAdmin as db } from "@/lib/supabase-server";
import { dailyOwner } from "@/lib/daily/server";
import { mapEvent } from "@/lib/public-events/map";
import { eventView, type Ticket, type Attempt } from "./model";
export async function eventAdminData(eventKey: string = mapEvent.key) {
  await dailyOwner();
  const [tickets, attempts] = await Promise.all([
    db
      .from("event_registrations")
      .select(
        "id,signup_attempt_id,person_id,attendee_name,email,phone,status,email_sent_at,checked_in_at,created_at,stripe_payment_intent_id",
        { count: "exact" },
      )
      .eq("event_key", eventKey)
      .order("created_at", { ascending: false })
      .range(0, 999),
    db
      .from("event_signup_attempts")
      .select(
        "id,attendee_name,email,phone,amount,state,created_at,payment_started_at",
        { count: "exact" },
      )
      .eq("event_key", eventKey)
      .order("created_at", { ascending: false })
      .range(0, 999),
  ]);
  if (
    tickets.error ||
    attempts.error ||
    (tickets.count ?? 0) > 1000 ||
    (attempts.count ?? 0) > 1000
  )
    throw Error("Registration records could not be loaded completely.");
  const ts = (tickets.data || []) as Ticket[],
    as = (attempts.data || []) as Attempt[];
  const intents = [
      ...new Set(
        ts
          .map((t) => t.stripe_payment_intent_id)
          .filter((x): x is string => !!x),
      ),
    ],
    ids = [
      ...new Set(ts.map((t) => t.person_id).filter((x): x is string => !!x)),
    ];
  const [refunds, people] = await Promise.all([
    intents.length
      ? db
          .from("event_refund_ledger")
          .select("stripe_payment_intent_id")
          .in("stripe_payment_intent_id", intents)
      : Promise.resolve({ data: [], error: null }),
    ids.length
      ? db.from("event_people").select("id,user_id").in("id", ids)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (refunds.error || people.error)
    throw Error("Payment or account status could not be verified.");
  return {
    ...eventView(
      ts,
      as,
      (refunds.data || []).map((r) => r.stripe_payment_intent_id),
      people.data || [],
    ),
    asOf: new Date().toISOString(),
  };
}
