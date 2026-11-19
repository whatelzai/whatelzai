import type { InviteContact } from "./ai-invites/model";
export type PortfolioEvent = {
  id: string;
  name: string;
  date: string | null;
  location: string | null;
  published: boolean;
  metadata: Record<string, unknown>;
  key?: string;
};
export function portfolioEvents(
  rows: PortfolioEvent[],
  legacy: PortfolioEvent,
) {
  const result = rows
    .map((e) => ({ ...e }))
    .filter(
      (e) => !e.metadata.superseded_by && e.metadata.status !== "duplicate",
    );
  const twin = result.find((e) => e.metadata.event_key === legacy.key);
  if (twin) twin.key = legacy.key;
  else result.push(legacy);
  return result.sort(
    (a, b) =>
      (b.date ?? "").localeCompare(a.date ?? "") || a.id.localeCompare(b.id),
  );
}
export function isUpcomingEvent(
  e: PortfolioEvent,
  today: string,
  now = Date.now(),
) {
  return (
    !!e.date &&
    e.date >= today &&
    !["cancelled", "archived"].includes(String(e.metadata.status)) &&
    !(
      typeof e.metadata.ends_at === "string" &&
      Date.parse(e.metadata.ends_at) <= now
    )
  );
}
export function isPastEvent(
  e: PortfolioEvent,
  today: string,
  now = Date.now(),
) {
  return (
    !!e.date &&
    (e.date < today ||
      (typeof e.metadata.ends_at === "string" &&
        Date.parse(e.metadata.ends_at) <= now))
  );
}
export function nextPortfolioEvent(
  events: PortfolioEvent[],
  today: string,
  now = Date.now(),
) {
  return (
    events
      .filter((e) => isUpcomingEvent(e, today, now))
      .sort(
        (a, b) => a.date!.localeCompare(b.date!) || a.id.localeCompare(b.id),
      )[0] ?? null
  );
}
export function eventReference(event: PortfolioEvent) {
  return (
    event.key ??
    (typeof event.metadata.event_key === "string"
      ? event.metadata.event_key
      : event.id)
  );
}
export function peopleStatistics(contacts: InviteContact[], today: string) {
  const people = contacts.map((c) => ({
    ...c,
    visits: [...new Map(c.attendance.map((a) => [a.ref, a])).values()],
  }));
  const attended = people.filter((c) => c.visits.length > 0);
  const events = new Map<
    string,
    { ref: string; title: string; date: string; people: Set<string> }
  >();
  for (const p of attended)
    for (const v of p.visits) {
      const e = events.get(v.ref) ?? { ...v, people: new Set<string>() };
      e.people.add(p.id);
      events.set(v.ref, e);
    }
  return {
    contacts: people.length,
    distinct: attended.length,
    visits: attended.reduce((n, c) => n + c.visits.length, 0),
    returning: attended
      .filter((c) => c.visits.length > 1)
      .sort(
        (a, b) =>
          b.visits.length - a.visits.length || a.name.localeCompare(b.name),
      ),
    events: [...events.values()]
      .map((e) => ({ ...e, attendees: e.people.size }))
      .sort((a, b) => b.date.localeCompare(a.date)),
    due: people
      .filter(
        (c) =>
          c.status === "active" && c.follow_up_on && c.follow_up_on <= today,
      )
      .sort((a, b) => a.follow_up_on!.localeCompare(b.follow_up_on!)),
  };
}
