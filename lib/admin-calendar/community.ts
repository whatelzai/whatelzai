import "server-only";
import { dailyOwner } from "@/lib/daily/server";
import { supabaseAdmin as db } from "@/lib/supabase-server";
import {
  expandMonth,
  type CalendarRecord,
} from "@/lib/community-calendar/ical";
import { localDay } from "@/lib/community-calendar/model";
import type { AdminCalendarEvent } from "./model";
/** Owner-only projection of the same imported community calendar already available in Admin. */
export async function ownerCommunityDates(year: number) {
  await dailyOwner();
  const snapshot = await db
    .from("community_calendar_imports")
    .select("id,record_count")
    .gt("imported_at", "1970-01-01T00:00:00Z")
    .order("imported_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (snapshot.error) throw Error("Community calendar unavailable");
  if (!snapshot.data) return [];
  const records: CalendarRecord[] = [];
  for (let offset = 0; offset < snapshot.data.record_count; offset += 500) {
    const page = await db
      .from("community_calendar_records")
      .select(
        "id,uid,recurrence_id,sequence,revision_at,message_id,received_at,ics",
      )
      .eq("import_id", snapshot.data.id)
      .order("id")
      .range(offset, offset + 499);
    if (page.error || !page.data?.length)
      throw Error("Community calendar incomplete");
    records.push(...(page.data as CalendarRecord[]));
  }
  if (records.length !== snapshot.data.record_count)
    throw Error("Community calendar incomplete");
  const events: AdminCalendarEvent[] = [];
  for (let y = year; y <= 2029; y++)
    for (let m = 1; m <= 12; m++)
      for (const e of expandMonth(
        records,
        `${y}-${String(m).padStart(2, "0")}`,
      )) {
        events.push({
          id: `community:${e.id}`,
          title: e.title,
          start: localDay(e.start),
          end: localDay(new Date(Date.parse(e.end) - 1).toISOString()),
          lane: "network-marketing",
          location: e.location,
          status: "Imported event · attendance not recorded",
          source: "Founder’s Club import",
          time: e.allDay
            ? undefined
            : new Date(e.start).toLocaleTimeString("en-SG", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
                timeZone: "Asia/Singapore",
              }),
          href: "/admin/network-marketing/app/calendar",
        });
      }
  return [...new Map(events.map((e) => [e.id, e])).values()];
}
