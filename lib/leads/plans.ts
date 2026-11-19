import type { Activity } from "./model";
export type UpcomingActivity = Pick<
  Activity,
  "lead_id" | "title" | "activity_on" | "status"
>;
export type Plan = {
  leadId: string;
  title: string;
  status: string;
  start: string;
  end: string;
};
const nextDay = (date: string) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + 86400000)
    .toISOString()
    .slice(0, 10);
export function groupPlans(activities: UpcomingActivity[]): Plan[] {
  const byEvent = new Map<string, UpcomingActivity[]>();
  for (const activity of activities) {
    if (!["Planned", "Tentative", "To invite"].includes(activity.status))
      continue;
    const key = JSON.stringify([
      activity.lead_id,
      activity.title,
      activity.status,
    ]);
    const list = byEvent.get(key) ?? [];
    list.push(activity);
    byEvent.set(key, list);
  }
  const groups: Plan[] = [];
  for (const list of byEvent.values()) {
    let group: Plan | undefined;
    for (const activity of list.sort((a, b) =>
      a.activity_on.localeCompare(b.activity_on),
    )) {
      if (
        group &&
        (activity.activity_on === group.end ||
          activity.activity_on === nextDay(group.end))
      )
        group.end = activity.activity_on;
      else {
        group = {
          leadId: activity.lead_id,
          title: activity.title,
          status: activity.status,
          start: activity.activity_on,
          end: activity.activity_on,
        };
        groups.push(group);
      }
    }
  }
  return groups.sort(
    (a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title),
  );
}
const shortDate = (date: string) =>
  new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
export function planDate(plan: Plan, today: string) {
  const range =
    plan.start === plan.end
      ? shortDate(plan.start)
      : `${shortDate(plan.start)} – ${shortDate(plan.end)}`;
  return plan.start === today ? `Today · ${range}` : range;
}
