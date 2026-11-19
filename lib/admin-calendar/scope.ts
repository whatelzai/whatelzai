import { adminWorkstreams, cleanAdminPath } from "@/lib/admin-navigation";
export type CalendarScope =
  | "all"
  | "personal"
  | "ai-business"
  | "network-marketing"
  | "day-job";
export function calendarScope(value: string | undefined | null): CalendarScope {
  return ["personal", "ai-business", "network-marketing", "day-job"].includes(
    value ?? "",
  )
    ? (value as CalendarScope)
    : "all";
}
export function calendarWorkspace(scope: CalendarScope) {
  return (
    adminWorkstreams.find((w) => cleanAdminPath(w.path) === "/" + scope)
      ?.label ?? "Overview"
  );
}
export function calendarWorkspaceHref(path: string) {
  const space = cleanAdminPath(path).slice(1);
  return (
    "/admin/calendar" + (space ? "?space=" + encodeURIComponent(space) : "")
  );
}
