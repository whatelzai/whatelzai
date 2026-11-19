export const weosRoles = [
  "beacon",
  "blaze",
  "torch",
  "ember",
  "guest",
] as const;
export type WeosRole = (typeof weosRoles)[number];
export const roleLabels: Record<WeosRole, string> = {
  beacon: "Beacon",
  blaze: "Blaze",
  torch: "Torch",
  ember: "Ember",
  guest: "Guest",
};
export const isWeosRole = (value: unknown): value is WeosRole =>
  typeof value === "string" && weosRoles.includes(value as WeosRole);
export const canUseBusinessTools = (role: WeosRole) =>
  ["beacon", "blaze", "torch"].includes(role);
export const canAdministerCommunity = (role: WeosRole) =>
  role === "beacon" || role === "blaze";
export const PREVIEW_COOKIE = "weos-role-preview";
export function effectiveRole(actual: WeosRole, requested: unknown): WeosRole {
  return actual === "beacon" &&
    typeof requested === "string" &&
    ["blaze", "torch", "ember"].includes(requested)
    ? (requested as WeosRole)
    : actual;
}
export function businessPath(path: string) {
  return [
    "/leads",
    "/briefings",
    "/team",
    "/communities",
    "/marketing-plan",
    "/pipeline",
    "/assistant/commitments",
    "/assistant/connections",
    "/api/leads",
    "/catalogue",
    "/culture",
  ].some((p) => path === p || path.startsWith(p + "/"));
}
export function memberDestinationAllowed(role: WeosRole, path: string) {
  return role !== "guest" && (!businessPath(path) || canUseBusinessTools(role));
}
export function roleTabs(role: WeosRole) {
  return [
    canUseBusinessTools(role)
      ? { href: "/leads", label: "Baobeis" }
      : { href: "/calendar", label: "Events" },
    { href: "/assistant", label: "Chat" },
    { href: "/", label: "Home" },
    { href: "/resources", label: "Resources" },
    { href: "/profile", label: "Profile" },
  ];
}

export const roleSourceAllowed = (role: WeosRole, source: string) =>
  role !== "guest" &&
  (canUseBusinessTools(role) || ["events", "learning"].includes(source));
export const roleToolAllowed = (role: WeosRole, tool: string) =>
  role !== "guest" && (canUseBusinessTools(role) || tool === "read_fcos");
