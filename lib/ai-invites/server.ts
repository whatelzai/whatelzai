import "server-only";
import { supabaseAdmin as db } from "@/lib/supabase-server";
import { dailyOwner } from "@/lib/daily/server";
import { mapEvent } from "@/lib/public-events/map";
import {
  attendanceFor,
  type Contact,
  type Invitation,
  type AttendanceLink,
  type TicketEvidence,
  type HistoricalEvidence,
} from "./model";
export async function loadInviteList() {
  const owner = await dailyOwner();
  const [contacts, invitations, links, tickets, history, events] =
    await Promise.all([
      db
        .from("ai_business_contacts")
        .select(
          "id,revision,name,email,phone,location,event_person_id,interests,context,collaboration,next_step,follow_up_on,relationship,status,priority,created_at,updated_at",
          { count: "exact" },
        )
        .eq("owner_id", owner)
        .order("name")
        .range(0, 999),
      db
        .from("ai_business_invitations")
        .select(
          "id,contact_id,revision,invited_on,event_label,channel,response,notes,voided,created_at",
          { count: "exact" },
        )
        .eq("owner_id", owner)
        .order("invited_on", { ascending: false })
        .range(0, 999),
      db
        .from("ai_business_attendance_links")
        .select("contact_id,ticket_id,historical_id", { count: "exact" })
        .eq("owner_id", owner)
        .range(0, 999),
      db
        .from("event_registrations")
        .select("id,event_key,person_id,email,status,checked_in_at", {
          count: "exact",
        })
        .not("checked_in_at", "is", null)
        .range(0, 999),
      db
        .from("event_attendance")
        .select("id,event_id,person_id,status,attendance_on", {
          count: "exact",
        })
        .range(0, 999),
      db
        .from("events")
        .select("id,name,date,metadata", { count: "exact" })
        .range(0, 999),
    ]);
  if (
    [contacts, invitations, links, tickets, history, events].some(
      (r) => r.error || (r.count ?? 0) > 1000,
    )
  )
    throw Error(
      "The Invite List could not be loaded completely. Refresh to retry.",
    );
  const eventMap: Record<
    string,
    { title: string; date: string; ref?: string }
  > = {
    [mapEvent.key]: {
      title: mapEvent.title,
      date: mapEvent.startsAt.slice(0, 10),
    },
  };
  for (const e of events.data ?? []) {
    const value = {
      title: e.name,
      date: e.date,
      ref:
        typeof e.metadata?.event_key === "string" ? e.metadata.event_key : e.id,
    };
    eventMap[e.id] = value;
    if (typeof e.metadata?.event_key === "string")
      eventMap[e.metadata.event_key] = value;
  }
  return {
    contacts: (contacts.data as Contact[]).map((c) => ({
      ...c,
      attendance: attendanceFor(
        c,
        links.data as AttendanceLink[],
        tickets.data as TicketEvidence[],
        history.data as HistoricalEvidence[],
        eventMap,
      ),
      invitations: (invitations.data as Invitation[]).filter(
        (i) => i.contact_id === c.id,
      ),
    })),
    asOf: new Date().toISOString(),
  };
}
