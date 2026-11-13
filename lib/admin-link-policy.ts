import { cleanAdminPath } from "./admin-navigation";
const publicHosts = new Set([
  "whatelz.ai",
  "www.whatelz.ai",
  "whatelz.vercel.app",
]);
const previewRoots = new Set([
  "about",
  "events",
  "testimonials",
  "blog",
  "career",
  "hackathons",
  "leadership",
  "mentorship",
  "services",
  "contact",
  "channels",
  "feedback",
]);
const memberRoots = new Set([
  "leads",
  "culture",
  "calendar",
  "catalogue",
  "member-home",
  "resources",
  "team",
  "briefings",
  "communities",
]);
export type AdminDestination =
  | { kind: "navigate"; href: string }
  | { kind: "file" | "external"; url: string };
export function adminDestination(
  href: string,
  origin: string,
  pathname: string,
): AdminDestination {
  const u = new URL(href, origin);
  if (!["http:", "https:"].includes(u.protocol))
    return { kind: "external", url: u.href };
  const suffix = u.search + u.hash;
  const p = u.pathname;
  const root = p.split("/")[1];
  const local = (path: string) => ({
    kind: "navigate" as const,
    href:
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      origin.includes("vercel.app")
        ? path
        : path.replace(/^\/admin(?=\/|$)/, "") || "/",
  });
  if (
    u.origin === origin &&
    (p.startsWith("/api/admin/event-poster") ||
      /\.(png|jpe?g|webp|gif|pdf|mp4|webm)$/i.test(p))
  )
    return { kind: "file", url: u.href };
  if (
    u.hostname.endsWith(".supabase.co") &&
    p.startsWith("/storage/v1/object/")
  )
    return { kind: "file", url: u.href };
  if (u.hostname === "admin.whatelz.ai" && u.origin !== origin)
    return local("/admin" + cleanAdminPath(p) + suffix);
  if (publicHosts.has(u.hostname)) {
    if (p === "/playbook" || p.startsWith("/playbook/"))
      return local("/admin/playbook");
    if (p === "/" || previewRoots.has(root))
      return local("/admin/preview" + (p === "/" ? "" : p) + suffix);
  }
  if (u.hostname === "app.whatelz.ai") {
    if (p === "/team") return local("/admin/team" + suffix);
    if (p === "/" || memberRoots.has(root))
      return local(
        "/admin/network-marketing/app" + (p === "/" ? "" : p) + suffix,
      );
  }
  if (u.origin === origin) {
    const clean = cleanAdminPath(pathname);
    if (
      clean.startsWith("/network-marketing/app") &&
      (p === "/" || memberRoots.has(root))
    )
      return local(
        "/admin/network-marketing/app" + (p === "/" ? "" : p) + suffix,
      );
    if (clean.startsWith("/preview") && (p === "/" || previewRoots.has(root)))
      return local("/admin/preview" + (p === "/" ? "" : p) + suffix);
    if (clean.startsWith("/network-marketing/app") && !p.startsWith("/admin/"))
      return { kind: "external", url: "https://app.whatelz.ai" + p + suffix };
    if (clean.startsWith("/preview") && !p.startsWith("/admin/"))
      return { kind: "external", url: "https://whatelz.ai" + p + suffix };
    return { kind: "navigate", href: p + suffix };
  }
  return { kind: "external", url: u.href };
}
export function adminParent(pathname: string): string {
  const p = cleanAdminPath(pathname);
  if (p.startsWith("/network-marketing/app/")) {
    const parts = p.split("/").filter(Boolean);
    return parts.length > 3
      ? "/admin/" + parts.slice(0, -1).join("/")
      : "/admin/network-marketing";
  }
  if (p.startsWith("/preview/")) {
    const parts = p.split("/").filter(Boolean);
    return parts.length > 2
      ? "/admin/" + parts.slice(0, -1).join("/")
      : "/admin/ai-business";
  }
  if (p === "/preview" || p === "/playbook") return "/admin/ai-business";
  if (p.startsWith("/personal/")) return "/admin/personal";
  if (p.startsWith("/today/")) return "/admin/today";
  const parts = p.split("/").filter(Boolean);
  if (parts.length > 1) return "/admin/" + parts.slice(0, -1).join("/");
  if (
    [
      "/ai-business",
      "/network-marketing",
      "/day-job",
      "/personal",
      "/settings",
      "/today",
    ].includes(p)
  )
    return "/admin";
  return "/admin/ai-business";
}
