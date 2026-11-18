export const adminWorkstreams = [
  { label: "Overview", path: "/admin" },
  { label: "Personal", path: "/admin/personal" },
  { label: "AI Business", path: "/admin/ai-business" },
  { label: "Network Marketing", path: "/admin/network-marketing" },
  { label: "Day Job", path: "/admin/day-job" },
] as const;

export const adminFocusSpaces = adminWorkstreams;

export function cleanAdminPath(pathname: string) {
  return pathname.replace(/^\/admin(?=\/|$)/, "") || "/";
}
const within = (path: string, root: string) =>
  path === root || path.startsWith(root + "/");

export function adminNavigation(pathname: string) {
  const path = cleanAdminPath(pathname);
  if (within(path, "/personal") || within(path, "/rhythm"))
    return { tab: "home" as const, workstream: "Personal" };
  if (within(path, "/chat")) return { tab: "chat" as const, workstream: null };
  if (within(path, "/calendar"))
    return { tab: "home" as const, workstream: "Overview" };
  if (
    ["/profile", "/settings", "/tokens", "/developer"].some((root) =>
      within(path, root),
    )
  )
    return { tab: "profile" as const, workstream: null };
  const workstream = [
    "/network-marketing",
    "/team",
    "/calendar-access",
    "/users",
  ].some((root) => within(path, root))
    ? "Network Marketing"
    : within(path, "/day-job")
      ? "Day Job"
      : path === "/" ||
          within(path, "/today") ||
          within(path, "/command-center") ||
          within(path, "/focus")
        ? "Overview"
        : "AI Business";
  return { tab: "home" as const, workstream };
}
