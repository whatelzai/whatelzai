import "server-only";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { hqhFacts } from "@/lib/leads/hqh-model";
import {
  boundedFollowupNotes,
  type FollowupNote,
} from "@/lib/leads/hqh-history";
import { discoverHqhEvent } from "@/lib/member-ai/hqh-discovery";
import { todayUtc8 } from "@/lib/leads/model";
import {
  expandMonth,
  type CalendarRecord,
} from "@/lib/community-calendar/ical";
import {
  filterCalendarEvents,
  isPersona,
} from "@/lib/community-calendar/personas";
import { futureEvents } from "./model";
import { nextMonth } from "./attention";
export async function databaseContext(
  source: string,
  query: string,
): Promise<Record<string, unknown>> {
  // This client carries the verified member JWT. Never substitute supabaseAdmin.
  const db = await createAuthClient();
  const { data, error } = await db.rpc("weos_read_context", {
    p_source: source,
    p_query: query,
  });
  if (error) throw Error("This context is unavailable for your account.");
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw Error("Context unavailable");
  return data;
}
export async function databaseHqh(
  query: string,
  budget = 8000,
): Promise<Record<string, unknown>> {
  const names = query
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean);
  if (!names.length || names.length > 6)
    throw Error("Choose one to six Baobeis");
  if (names.length > 1) {
    const rows = await Promise.all(
      names.map((name) => databaseHqh(name, Math.floor(10000 / names.length))),
    );
    return {
      people: rows.map((row) => ({
        person: row.person,
        currentHqh: row.currentHqh,
        activities: row.activities,
        history: row.history,
      })),
      format: rows.find((x) => x.format)?.format,
      coverage:
        "Requested order retained; database permission checked for every person. Bounded dated follow-ups, not a claim of all history.",
    };
  }
  const raw = await databaseContext("hqh", names[0]);
  if (!raw.person) return raw;
  return {
    person: raw.person,
    currentHqh: hqhFacts(raw.metadata),
    activities: raw.activities,
    history: boundedFollowupNotes(
      (raw.followups ?? []) as FollowupNote[],
      budget,
    ),
    format: raw.format,
    coverage:
      "Current person profile and up to twenty database-authorized linked notes. Past plans remain history; an event is optional.",
  };
}
export async function databaseHqhDiscovery(query: string) {
  const raw = await databaseContext("hqh_discover", query);
  const people = (raw.people ?? []) as { id: string; name: string }[];
  const normalized = query.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const mentioned = people.filter((p) => {
    const parts = p.name.toLowerCase().split(/\s+/);
    return [p.name, parts.slice(-2).join(""), parts[0]]
      .filter((x) => x && x.length >= 4)
      .some((n) =>
        normalized.includes(n.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")),
      );
  });
  const found = mentioned.length
    ? null
    : discoverHqhEvent(
        (raw.notes ?? []) as {
          event_name: string;
          occurred_on: string;
          lead_ids: string[];
        }[],
        new Set(people.map((p) => p.id)),
        query,
        todayUtc8(),
      );
  const names = mentioned.length
    ? mentioned.map((p) => p.name)
    : found?.selected?.leadIds.map(
        (id) => people.find((p) => p.id === id)!.name,
      );
  if (!names?.length || names.length > 6)
    return {
      resolved: false,
      candidates:
        found?.candidates.map((x) => ({ event: x.event, date: x.date })) ?? [],
      coverage:
        "Saved permitted people/cohorts are ambiguous or unavailable; ask one narrow question.",
    };
  return {
    resolved: true,
    names,
    ...(await databaseHqh(names.join(" | "))),
    optionalContext: found?.selected
      ? { event: found.selected.event, date: found.selected.date }
      : undefined,
  };
}
export async function databaseEvents(query: string) {
  const raw = await databaseContext("events", query),
    month = todayUtc8().slice(0, 7);
  const persona =
    raw.persona === "Admin"
      ? "Admin"
      : isPersona(raw.persona)
        ? raw.persona
        : "Guest";
  const expanded = [month, nextMonth(month)].flatMap((m) =>
    expandMonth((raw.records ?? []) as CalendarRecord[], m),
  );
  const match = (text: string) =>
    text.toLowerCase().includes(query.toLowerCase());
  const items = futureEvents(
    filterCalendarEvents(expanded, persona),
    new Date(),
  )
    .filter((x) => match(x.title))
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 6);
  const whatelz = (
    (raw.public_events ?? []) as { title: string; date: string }[]
  )
    .filter((x) => x.date >= todayUtc8() && match(x.title))
    .slice(0, 6);
  return { items, whatelz, coverage: raw.coverage, url: "/calendar" };
}
