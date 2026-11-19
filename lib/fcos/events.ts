import "server-only";
import { loadCommunityCalendar } from "@/lib/community-calendar/server";
import { validMonth, localDay } from "@/lib/community-calendar/model";
export async function calendarEvent(month: string, key: string) {
  if (!validMonth(month) || !key || key.length > 1024) return null;
  // No preview persona is accepted here, including when saving a note.
  const calendar = await loadCommunityCalendar(month);
  return calendar.events.find((event) => event.id === key) ?? null;
}
export async function briefingEvents(month: string) {
  const calendar = await loadCommunityCalendar(month);
  return calendar.events.map((event) => ({
    key: event.id,
    month: localDay(event.start).slice(0, 7),
    title: event.title,
    date: localDay(event.start),
  }));
}
