import type { Task } from "./daily/model";
import { selectedSprint } from "./admin-reading";
export const workLanes = [
  { lane: "ai-business", label: "AI Business", path: "/admin/ai-business" },
  {
    lane: "network-marketing",
    label: "Network Marketing",
    path: "/admin/network-marketing",
  },
  { lane: "day-job", label: "Day Job", path: "/admin/day-job" },
] as const;
export function currentWeek(day: string) {
  const date = new Date(day + "T12:00:00Z");
  const offset = (date.getUTCDay() + 6) % 7;
  const start = new Date(date.getTime() - offset * 86400000)
    .toISOString()
    .slice(0, 10);
  const end = new Date(Date.parse(start + "T12:00:00Z") + 6 * 86400000)
    .toISOString()
    .slice(0, 10);
  return { start, end };
}
export function weeklyWork(tasks: Task[], day: string) {
  const week = currentWeek(day);
  const accepted = tasks
    .filter(
      (t) =>
        !!t.accepted_on &&
        ["open", "blocked", "waiting"].includes(t.status) &&
        t.due_on <= week.end,
    )
    .sort(
      (a, b) => a.due_on.localeCompare(b.due_on) || a.id.localeCompare(b.id),
    );
  return {
    week,
    next: selectedSprint(tasks, day)[0] ?? null,
    lanes: workLanes.map((l) => ({
      ...l,
      task: accepted.find((t) => t.lane === l.lane) ?? null,
    })),
  };
}
