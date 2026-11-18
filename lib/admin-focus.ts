import {
  adminFocusSpaces,
  cleanAdminPath,
  adminNavigation,
} from "./admin-navigation";
export type FocusSpace = (typeof adminFocusSpaces)[number]["label"];
export type FocusBlock = {
  days: "weekdays" | "weekends";
  start: number;
  end: number;
  space: FocusSpace;
};
export type FocusSettings = {
  enabled: boolean;
  override: "block" | "manual";
  blocks: FocusBlock[];
};
export const DEFAULT_FOCUS: FocusSettings = {
  enabled: true,
  override: "block",
  blocks: [
    { days: "weekdays", start: 480, end: 540, space: "Overview" },
    { days: "weekdays", start: 540, end: 1080, space: "Day Job" },
    { days: "weekdays", start: 1080, end: 1140, space: "Overview" },
    { days: "weekdays", start: 1140, end: 1320, space: "Network Marketing" },
    { days: "weekends", start: 540, end: 1080, space: "AI Business" },
  ],
};
// Saved schedules support all four epics, including Personal.
export function normalizeFocusSettings(settings: FocusSettings): FocusSettings {
  return settings;
}
export const focusPath = (space: FocusSpace) =>
  adminFocusSpaces.find((item) => item.label === space)!.path;
export function rootSpace(path: string): FocusSpace | null {
  return (
    adminFocusSpaces.find(
      (item) => cleanAdminPath(item.path) === cleanAdminPath(path),
    )?.label ?? null
  );
}
export function validFocusSettings(value: unknown): value is FocusSettings {
  if (!value || typeof value !== "object") return false;
  const config = value as FocusSettings;
  if (
    typeof config.enabled !== "boolean" ||
    !["block", "manual"].includes(config.override) ||
    !Array.isArray(config.blocks) ||
    config.blocks.length > 24
  )
    return false;
  for (const block of config.blocks) {
    if (
      !block ||
      !["weekdays", "weekends"].includes(block.days) ||
      !adminFocusSpaces.some((item) => item.label === block.space) ||
      !Number.isInteger(block.start) ||
      !Number.isInteger(block.end) ||
      block.start < 0 ||
      block.end > 1440 ||
      block.start >= block.end
    )
      return false;
  }
  for (const days of ["weekdays", "weekends"]) {
    const blocks = config.blocks
      .filter((block) => block.days === days)
      .sort((a, b) => a.start - b.start);
    if (blocks.some((block, i) => i > 0 && blocks[i - 1].end > block.start))
      return false;
  }
  return true;
}
export function focusAt(now: Date, config: FocusSettings = DEFAULT_FOCUS) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Singapore",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const days =
    parts.weekday === "Sat" || parts.weekday === "Sun"
      ? "weekends"
      : "weekdays";
  const minute = Number(parts.hour) * 60 + Number(parts.minute);
  const blocks = config.blocks.filter((block) => block.days === days);
  const block = blocks.find(
    (block) => minute >= block.start && minute < block.end,
  );
  const boundaries = [
    0,
    1440,
    ...blocks.flatMap((block) => [block.start, block.end]),
  ].sort((a, b) => a - b);
  const start = Math.max(...boundaries.filter((time) => time <= minute));
  const end = Math.min(...boundaries.filter((time) => time > minute));
  const space = block?.space ?? "Overview";
  return {
    space,
    path: focusPath(space),
    key: `${date}:${start}:${end}:${space}`,
    startsAt: Date.parse(`${date}T00:00:00+08:00`) + start * 60000,
    endsAt: Date.parse(`${date}T00:00:00+08:00`) + end * 60000,
  };
}
export type ScheduledFocus = ReturnType<typeof focusAt>;
export function canAutoSwitch(input: {
  path: string;
  initial: boolean;
  standalone: boolean;
  hash: string;
  dirty: boolean;
  editing: boolean;
  dialog: boolean;
  visible: boolean;
}) {
  if (!input.visible || input.dirty || input.editing || input.dialog)
    return false;
  if (input.initial)
    return (
      (!input.hash && cleanAdminPath(input.path) === "/") ||
      (input.standalone &&
        cleanAdminPath(input.path) === "/today" &&
        !input.hash)
    );
  const path = cleanAdminPath(input.path);
  if (path === "/users" || path.startsWith("/users/")) return false;
  return adminNavigation(input.path).tab === "home";
}
export function minuteInput(value: number) {
  if (!Number.isFinite(value)) return "";
  return `${String(Math.floor(value / 60) % 24).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
export function parseMinute(value: string, end = false) {
  if (!/^\d{2}:\d{2}$/.test(value)) return NaN;
  const [hour, minute] = value.split(":").map(Number);
  if (hour > 23 || minute > 59) return NaN;
  return end && hour === 0 && minute === 0 ? 1440 : hour * 60 + minute;
}
