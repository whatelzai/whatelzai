import { currentWeek } from "@/lib/admin-week";
export type CalendarLane = "ai-business" | "network-marketing" | "day-job";
export type AdminCalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  lane: CalendarLane;
  location: string;
  status: string;
  source: string;
  href?: string;
  time?: string;
};
export type CalendarView = "day" | "week" | "month" | "quarter" | "year";
export const calendarLanes = [
  { id: "ai-business", label: "AI Business" },
  { id: "network-marketing", label: "Network Marketing" },
  { id: "day-job", label: "Day Job" },
] as const;
export function validDay(day: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(day) &&
    !Number.isNaN(Date.parse(day)) &&
    new Date(day + "T12:00:00Z").toISOString().slice(0, 10) === day
  );
}
/** Project only explicit date-table cells; never parse narrative as an event or attendance. */
export function planningEvents(
  markdown: string,
  lane: CalendarLane,
  source: string,
): AdminCalendarEvent[] {
  const result: AdminCalendarEvent[] = [];
  for (const line of markdown.split("\n")) {
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (
      cells.length < 3 ||
      !validDay(cells[1]) ||
      !validDay(cells[2]) ||
      cells[2] < cells[1]
    )
      continue;
    result.push({
      id: `${lane}:${cells[0]}:${cells[1]}`,
      title: cells[0],
      start: cells[1],
      end: cells[2],
      lane,
      location: lane === "day-job" ? "" : (cells[3] ?? ""),
      status:
        lane === "day-job"
          ? `Company ${cells[3] ?? "sprint"}`
          : "Planning date · attendance not recorded",
      source,
    });
  }
  // Owner's event-specific guest-planning node uses an explicit inclusive range.
  for (const m of markdown.matchAll(
    /^## (.+?) — (\d{4}-\d{2}-\d{2})[–—](\d{2}) — guest planning\s*$/gm,
  )) {
    const end = m[2].slice(0, 8) + m[3];
    if (validDay(m[2]) && validDay(end) && end >= m[2])
      result.push({
        id: `${lane}:${m[1]}:${m[2]}`,
        title: m[1],
        start: m[2],
        end,
        lane,
        location: "",
        status: "Guest planning",
        source,
      });
  }
  return [...new Map(result.map((e) => [e.id, e])).values()];
}
export function period(day: string, view: CalendarView) {
  if (view === "day") return { start: day, end: day };
  if (view === "week") return currentWeek(day);
  const y = Number(day.slice(0, 4)),
    m = Number(day.slice(5, 7)) - 1;
  const startMonth =
    view === "year" ? 0 : view === "quarter" ? Math.floor(m / 3) * 3 : m;
  const months = view === "year" ? 12 : view === "quarter" ? 3 : 1;
  return {
    start: new Date(Date.UTC(y, startMonth, 1)).toISOString().slice(0, 10),
    end: new Date(Date.UTC(y, startMonth + months, 0))
      .toISOString()
      .slice(0, 10),
  };
}
export function shiftPeriod(
  day: string,
  view: CalendarView,
  direction: number,
) {
  const bounds = period(day, view),
    d = new Date(bounds.start + "T12:00:00Z");
  if (view === "day" || view === "week")
    d.setUTCDate(d.getUTCDate() + direction * (view === "day" ? 1 : 7));
  else
    d.setUTCMonth(
      d.getUTCMonth() +
        direction * (view === "month" ? 1 : view === "quarter" ? 3 : 12),
    );
  return d.toISOString().slice(0, 10);
}
export function visibleEvents(
  events: AdminCalendarEvent[],
  day: string,
  view: CalendarView,
  lane: string,
) {
  const p = period(day, view);
  return events
    .filter(
      (e) =>
        (lane === "all" || e.lane === lane) &&
        e.start <= p.end &&
        e.end >= p.start,
    )
    .sort(
      (a, b) =>
        a.start.localeCompare(b.start) || a.title.localeCompare(b.title),
    );
}
