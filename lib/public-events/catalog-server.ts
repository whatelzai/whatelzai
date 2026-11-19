import "server-only";
import { cache } from "react";
import { supabaseAdmin as db } from "@/lib/supabase-server";
import { projectEvent, type CatalogRow, type CatalogEvent } from "./catalog";

export const publicEventNow = cache(() => Date.now());
export const loadPublicEvents = cache(async (): Promise<CatalogEvent[]> => {
  const source = await db
    .from("events")
    .select("id,type,slug,name,date,location,published,metadata", {
      count: "exact",
    })
    .eq("published", true)
    .in("type", ["training", "workshop", "talk"])
    .order("date", { ascending: false })
    .range(0, 999);
  if (source.error || (source.count ?? 0) > 1000)
    throw Error("Event information is unavailable. Please try again shortly.");
  const events = (source.data as CatalogRow[]).flatMap((row) => {
    const event = projectEvent(row);
    return event ? [event] : [];
  });
  if (!events.length) return [];
  const eventKeys = events.flatMap((e) => (e.key ? [e.key] : []));
  const [tickets, history, offers] = await Promise.all([
    eventKeys.length
      ? db
          .from("event_registrations")
          .select("id,event_key,person_id", { count: "exact" })
          .in("event_key", eventKeys)
          .eq("status", "confirmed")
          .eq("is_test", false)
          .not("checked_in_at", "is", null)
          .range(0, 999)
      : Promise.resolve({ data: [], count: 0, error: null }),
    db
      .from("event_attendance")
      .select("id,event_id,person_id", { count: "exact" })
      .in(
        "event_id",
        events.map((e) => e.recordId),
      )
      .eq("status", "checked_in")
      .range(0, 999),
    db
      .from("event_signup_offers")
      .select("event_id,amount,currency,closes_at,enabled", { count: "exact" })
      .in(
        "event_id",
        events.map((e) => e.recordId),
      )
      .eq("enabled", true)
      .range(0, 999),
  ]);
  if (offers.error || (offers.count ?? 0) > 1000)
    throw Error("Event registration information is unavailable.");
  const countsAvailable = ![tickets, history].some(
    (r) => r.error || (r.count ?? 0) > 1000,
  );
  for (const e of events) {
    if (countsAvailable) {
      const people = new Set<string>();
      for (const t of tickets.data ?? [])
        if (t.event_key === e.key)
          people.add(t.person_id ? "person:" + t.person_id : "ticket:" + t.id);
      for (const h of history.data ?? [])
        if (h.event_id === e.recordId)
          people.add(h.person_id ? "person:" + h.person_id : "history:" + h.id);
      e.attended = people.size;
    }
    const offer = (offers.data ?? []).find(
      (o) =>
        o.event_id === e.recordId &&
        o.currency === "sgd" &&
        o.amount === e.priceMinor &&
        Date.parse(o.closes_at) > publicEventNow(),
    );
    const price = (source.data as CatalogRow[]).find(
      (row) => row.id === e.recordId,
    )?.metadata.stripe_price_id;
    if (
      offer &&
      e.format === "weekly" &&
      typeof price === "string" &&
      /^price_[A-Za-z0-9]+$/.test(price)
    )
      e.registrationUrl = `/events/register?event=${encodeURIComponent(e.id)}`;
  }
  return events;
});
