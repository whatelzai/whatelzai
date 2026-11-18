import type { Task } from "../daily/model";
import type { AdminCalendarEvent } from "../admin-calendar/model";
import { currentWeek, workLanes } from "../admin-week";
export type FocusItem = {
  id: string;
  title: string;
  lane: Task["lane"];
  start: string;
  end: string;
  kind: "task" | "event";
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
  const anchors: FocusItem[] = events
    .filter((e) => !lane || e.lane === lane)
    .map((e) => ({
      ...e,
      id: `event:${e.id}`,
      kind: "event",
      href: e.href ?? "/admin/calendar",
    }));
  const sort = (a: FocusItem, b: FocusItem) =>
    a.start.localeCompare(b.start) ||
    (a.time ?? "").localeCompare(b.time ?? "") ||
    a.id.localeCompare(b.id);
  const today = [
    ...accepted.filter((t) => t.start <= day),
    ...anchors.filter((e) => e.start <= day && e.end >= day),
  ].sort(sort);
  const weekly = [
    ...accepted.filter((t) => t.start <= week.end),
    ...anchors.filter((e) => e.start <= week.end && e.end >= week.start),
  ].sort(sort);
  const next = workLanes
    .filter((l) => !lane || l.lane === lane)
    .flatMap((l) => {
      if (
        anchors.some(
          (e) => e.lane === l.lane && e.start <= week.end && e.end >= day,
        )
      )
        return [];
      const event = anchors
        .filter((e) => e.lane === l.lane && e.start > week.end)
        .sort(sort)[0];
      return event ? [event] : [];
    });
  return { today, weekly, next, week };
}
