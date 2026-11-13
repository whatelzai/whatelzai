import type { CalendarOccurrence } from "./model";
export const personas = [
  "Oracle",
  "Architect",
  "Catalyst",
  "Spark",
  "Guest",
] as const;
export type Persona = (typeof personas)[number];
export const personaDescriptions: Record<Persona, string> = {
  Oracle: "Founder’s Club founders",
  Architect: "Founding pillars of Founder’s Club",
  Catalyst: "Has an ABO account",
  Spark: "Paid Founder’s Club membership · No ABO account yet",
  Guest: "Not a Founder’s Club member yet · Getting to know the community",
};
export function isPersona(value: unknown): value is Persona {
  return personas.some((p) => p === value);
}
export type EventAudience = {
  members: Persona[];
  guestInvitation: boolean;
  confirmed: boolean;
};
// An unknown activity is visible only to the founder/admin for review.
export function eventAudience(title: string): EventAudience {
  if (/^(badminton|captain ball)$/i.test(title.trim()))
    return {
      members: ["Oracle", "Architect", "Catalyst", "Spark"],
      guestInvitation: true,
      confirmed: true,
    };
  if (
    /^founders?['’]? (intro|gather|collab)$/i.test(title.trim()) ||
    /^(monday opp class|wednesday soonye leadership class|shopping tour|hq tour|hqh(?: for .*)?)$/i.test(
      title.trim(),
    )
  )
    return {
      members: ["Oracle", "Architect", "Catalyst"],
      guestInvitation: false,
      confirmed: true,
    };
  return { members: ["Oracle"], guestInvitation: false, confirmed: false };
}
export function canViewEvent(title: string, persona: Persona) {
  const audience = eventAudience(title);
  return (
    audience.members.includes(persona) ||
    (persona === "Guest" && audience.guestInvitation)
  );
}
export function filterCalendarEvents(
  events: CalendarOccurrence[],
  persona: Persona | "Admin",
) {
  return persona === "Admin"
    ? events
    : events.filter((e) => canViewEvent(e.title, persona));
}
export function audienceLabel(title: string) {
  const a = eventAudience(title);
  return a.confirmed
    ? a.members.join(" · ")
    : "Audience to confirm · Oracle review";
}
export function calendarView(
  persona: Persona,
  admin: boolean,
  requested?: string,
): Persona | "Admin" {
  return admin ? (isPersona(requested) ? requested : "Admin") : persona;
}
