export type SeedTicket = {
  id: string;
  person_id: string | null;
  attendee_name: string;
  email: string;
  phone: string;
  status: string;
  checked_in_at: string | null;
};
export type SeedHistory = {
  id: string;
  person_id: string | null;
  display_name: string;
  status: string;
  returned_later: boolean;
};
export function seedPlan(
  tickets: SeedTicket[],
  history: SeedHistory[],
  confirmedReturningNames: string[],
) {
  const contacts = new Map<
      string,
      {
        key: string;
        event_person_id: string | null;
        name: string;
        email: string | null;
        phone: string;
      }
    >(),
    links: {
      key: string;
      ticket_id: string | null;
      historical_id: string | null;
    }[] = [];
  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const active = tickets.filter(
      (t) => t.status === "confirmed" && t.checked_in_at,
    ),
    returning = new Set(confirmedReturningNames.map(normalize));
  for (const t of active) {
    const key = t.person_id ? `person:${t.person_id}` : `ticket:${t.id}`;
    if (!contacts.has(key))
      contacts.set(key, {
        key,
        event_person_id: t.person_id,
        name: t.attendee_name,
        email: t.email.trim().toLowerCase() || null,
        phone: t.phone || "",
      });
    links.push({ key, ticket_id: t.id, historical_id: null });
  }
  for (const h of history.filter((h) => h.status === "checked_in")) {
    let key =
      h.person_id && contacts.has(`person:${h.person_id}`)
        ? `person:${h.person_id}`
        : `historical:${h.id}`;
    if (
      key.startsWith("historical:") &&
      h.returned_later &&
      returning.has(normalize(h.display_name))
    ) {
      const matches = active.filter(
        (t) => normalize(t.attendee_name) === normalize(h.display_name),
      );
      if (matches.length !== 1)
        throw Error(
          "A confirmed returning person needs an unambiguous ticket match.",
        );
      key = matches[0].person_id
        ? `person:${matches[0].person_id}`
        : `ticket:${matches[0].id}`;
    }
    if (!contacts.has(key))
      contacts.set(key, {
        key,
        event_person_id: h.person_id,
        name: h.display_name,
        email: null,
        phone: "",
      });
    links.push({ key, ticket_id: null, historical_id: h.id });
  }
  return { contacts: [...contacts.values()], links };
}
