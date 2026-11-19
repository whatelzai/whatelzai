import type { Attendee } from "./model";
import { parseTicket } from "../event-checkin-policy";
export async function manualCheckin(
  person: Pick<Attendee, "name" | "ticket" | "status" | "checkedIn">,
  confirm: (message: string) => boolean,
  request: typeof fetch = fetch,
) {
  if (
    person.status !== "confirmed" ||
    person.checkedIn ||
    !person.ticket ||
    !parseTicket(person.ticket)
  )
    return null;
  if (
    !confirm(
      `Check in ${person.name}?\n\nThis records their attendance for this event.`,
    )
  )
    return null;
  const response = await request("/api/event-checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticket: person.ticket }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (
    !response.ok ||
    !["checked_in", "already_checked_in"].includes(result.status) ||
    typeof result.at !== "string" ||
    !Number.isFinite(Date.parse(result.at))
  )
    throw Error(
      result.error || "Check-in could not be confirmed. Please retry.",
    );
  return result as {
    status: "checked_in" | "already_checked_in";
    name: string;
    at: string;
  };
}
