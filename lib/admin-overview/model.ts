import type { Task, Brief } from "@/lib/daily/model";
import type { OwnerMetrics, WidgetState } from "@/lib/cockpit";
export type Source<T> =
  | { status: "ready"; data: T }
  | { status: "unavailable" };
export function aiBusinessFocus(
  active: Task[],
  completed: Task[],
  day: string,
) {
  const accepted = active.filter(
    (t) =>
      t.lane === "ai-business" &&
      !!t.accepted_on &&
      ["open", "blocked", "waiting"].includes(t.status),
  );
  const due = accepted.filter((t) => t.due_on <= day);
  const actionable = due
    .filter((t) => t.status === "open")
    .sort(
      (a, b) => a.due_on.localeCompare(b.due_on) || a.id.localeCompare(b.id),
    );
  return {
    focus: actionable.slice(0, 3),
    due: due.length,
    actionable: actionable.length,
    overdue: due.filter((t) => t.due_on < day).length,
    blocked: due.filter((t) => t.status === "blocked").length,
    waiting: due.filter((t) => t.status === "waiting").length,
    proposals: active.filter(
      (t) => t.lane === "ai-business" && t.status === "proposed",
    ).length,
    completed: completed.filter(
      (t) => t.lane === "ai-business" && t.status === "done",
    ).length,
    upcoming: accepted
      .filter((t) => t.due_on > day && t.status === "open")
      .sort((a, b) => a.due_on.localeCompare(b.due_on))
      .slice(0, 3),
  };
}
export function briefStatus(
  source: Source<Brief>,
  kind: "morning" | "evening",
  now: Date,
) {
  if (source.status === "unavailable") return "Unavailable";
  if (source.data.exists) return "Saved in EMDEE";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Singapore",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const minutes =
    Number(parts.find((p) => p.type === "hour")?.value) * 60 +
    Number(parts.find((p) => p.type === "minute")?.value);
  return minutes < (kind === "morning" ? 270 : 1260)
    ? "Not due yet"
    : "No saved entry found";
}
export function productSignal(state: WidgetState<OwnerMetrics>, now: Date) {
  if (state.status !== "available") return "unavailable";
  const timestamp = Date.parse(state.data.generated_at);
  if (!Number.isFinite(timestamp) || timestamp > now.getTime() + 300000)
    return "unavailable";
  return now.getTime() - timestamp > 86400000 ? "stale" : "available";
}
