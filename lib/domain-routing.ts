export type SiteSurface = "public" | "admin" | "app";

export function siteSurface(hostname: string): SiteSurface {
  const host = hostname.toLowerCase().split(":")[0];
  if (host === "admin.whatelz.ai" || host === "admin.localhost") return "admin";
  if (host === "app.whatelz.ai" || host === "app.localhost") return "app";
  return "public";
}

export function stripAdminPath(path: string): string {
  return path.replace(/^\/admin(?=\/|$)/, "") || "/";
}

export function domainRoute(hostname: string, pathname: string) {
  const surface = siteSurface(hostname);
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const infrastructure =
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/auth/");
  const authPage = /^\/sign-(in|up)(\/|$)/.test(pathname);
  const local = hostname.split(":")[0].endsWith("localhost");

  if (
    isAdmin &&
    (surface !== "public" ||
      hostname === "whatelz.ai" ||
      hostname === "www.whatelz.ai")
  ) {
    const origin = local
      ? `http://admin.localhost${hostname.includes(":") ? ":" + hostname.split(":")[1] : ""}`
      : "https://admin.whatelz.ai";
    return { surface, redirect: origin + stripAdminPath(pathname) };
  }
  if (
    surface === "public" &&
    (pathname === "/member-home" ||
      pathname === "/pending-assignment" ||
      pathname === "/assistant" ||
      pathname.startsWith("/assistant/") ||
      pathname === "/team" ||
      pathname === "/catalogue" ||
      pathname === "/calendar" ||
      pathname.startsWith("/calendar/") ||
      pathname === "/profile" ||
      pathname === "/culture" ||
      pathname === "/resources" ||
      pathname === "/communities" ||
      pathname === "/briefings" ||
      pathname.startsWith("/briefings/") ||
      pathname === "/leads" ||
      pathname.startsWith("/leads/"))
  ) {
    return {
      surface,
      redirect: `https://app.whatelz.ai${pathname === "/member-home" ? "/" : pathname}`,
    };
  }
  if (surface === "admin" && !infrastructure && !authPage) {
    return {
      surface,
      rewrite: `/admin${pathname === "/" ? "" : pathname}`,
      protect: true,
    };
  }
  if (surface === "app" && pathname === "/") {
    return { surface, rewrite: "/member-home", protect: true };
  }
  return {
    surface,
    protect: isAdmin || (surface === "app" && !infrastructure && !authPage),
  };
}
