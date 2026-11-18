import type { Task } from "../daily/model";
import type { AdminCalendarEvent } from "../admin-calendar/model";
import { addDays, validDay } from "../admin-calendar/model";
import { currentWeek } from "../admin-week";
export type FocusItem = {
  id: string;
  title: string;
  lane: Task["lane"] | "administration";
  start: string;
  end: string;
  kind: "task" | "event" | "routine";
  status: string;
  href: string;
  time?: string;
};
/** Calendar anchors are context, never implicit accepted work or attendance. */
export function focusHorizons(
  tasks: Task[] | null,
  events: AdminCalendarEvent[],
  day: string,
  lane?: Task["lane"],
) {
  const week = currentWeek(day);
  const accepted: FocusItem[] = (tasks ?? [])
    .filter(
      (t) =>
        t.accepted_on &&
        ["open", "blocked", "waiting"].includes(t.status) &&
        (!lane || t.lane === lane),
    )
    .map((t) => ({
      id: `task:${t.id}`,
      title: t.title,
      lane: t.lane,
      start: t.due_on,
      end: t.due_on,
      kind: "task",
      status:
        t.status === "open"
          ? t.due_on < day
            ? "Carried forward"
            : "Accepted"
          : t.status === "blocked"
            ? "Blocked"
            : "Waiting",
      href: "/admin/today#commitments",
    }));
  const calendarAnchors: FocusItem[] = events
    .filter((e) => !lane || e.lane === lane)
    .map((e) => ({
      ...e,
      id: `event:${e.id}`,
      kind: "event",
      href: e.href ?? "/admin/calendar",
    }));
  const anchors = [
    ...calendarAnchors,
    ...(!lane ? administrativeFocus(day) : []),
  ];
  const sort = (a: FocusItem, b: FocusItem) =>
    a.start.localeCompare(b.start) ||
    (a.time ?? "").localeCompare(b.time ?? "") ||
    a.id.localeCompare(b.id);
  const today = [
    ...accepted.filter((t) => t.start <= day),
    ...anchors.filter((e) => e.start <= day && e.end >= day),
  ].sort(sort);
  const weekly = [
    ...accepted.filter((t) => t.start > day && t.start <= week.end),
    ...anchors.filter((e) => e.start > day && e.start <= week.end),
  ].sort(sort);
  return { today, weekly, week };
}

export function focusReference(id: string) {
  let hash = 2166136261;
  for (const c of id) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  return `${id.startsWith("task:") ? "TASK" : id.startsWith("routine:") ? "RHYTHM" : "EVENT"}-${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}
export function focusPath(
  id: string,
  horizon: "today" | "week",
  lane?: Task["lane"],
) {
  return `/admin${lane ? "/" + lane : ""}/focus/${encodeURIComponent(id)}?horizon=${horizon}`;
}

export function administrativeFocus(day: string): FocusItem[] {
  if (!validDay(day)) return [];
  const week = currentWeek(day);
  const number =
    Math.floor(
      (Date.parse(week.start) - Date.parse("2026-11-16")) / (7 * 86400000),
    ) + 1;
  const sprint = (n: number) => `Sprint-${String(n).padStart(3, "0")}`;
  if (number < 1) return [];
  return [
    {
      key: "planning",
      day: addDays(week.start, 3),
      title: `Plan next week · ${sprint(number + 1)}`,
      slug: "whatelz-sprint-planning",
    },
    {
      key: "closeout",
      day: week.end,
      title: `Close this week · ${sprint(number)}`,
      slug: "whatelz-weekly-closeout",
    },
  ].map((r) => ({
    id: `routine:${r.key}:${r.day}`,
    title: r.title,
    lane: "administration",
    start: r.day,
    end: r.day,
    kind: "routine",
    time: "21:00",
    status: "Weekly rhythm",
    href: `/admin/today/routines/${r.slug}`,
  }));
}
