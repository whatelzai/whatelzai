import { hasTeamAssignment } from "@/lib/team-assignment";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { authCookieOptions } from "@/lib/auth/redirect";
import { NextResponse } from "next/server";
import { isOwnerUser, isAdminRequest } from "@/lib/admin-policy";
import { supabaseAdmin } from "@/lib/supabase-server";
import { domainRoute } from "@/lib/domain-routing";

export default async function proxy(req: NextRequest) {
  const route = domainRoute(
    req.headers.get("host") ?? req.nextUrl.host,
    req.nextUrl.pathname,
  );
  if (route.redirect) {
    const destination = new URL(route.redirect);
    destination.search = req.nextUrl.search;
    return NextResponse.redirect(destination, 308);
  }
  let sessionResponse = NextResponse.next({ request: req });
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: authCookieOptions(req.headers.get("host") ?? ""),
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll(values, cacheHeaders) {
          values.forEach(({ name, value }) => req.cookies.set(name, value));
          sessionResponse = NextResponse.next({ request: req });
          values.forEach(({ name, value, options }) =>
            sessionResponse.cookies.set(name, value, options),
          );
          Object.entries(cacheHeaders).forEach(([name, value]) =>
            sessionResponse.headers.set(name, value),
          );
        },
      },
    },
  );
  const {
    data: { user },
  } = await client.auth.getUser();
  function finish(response: NextResponse) {
    for (const cookie of sessionResponse.cookies.getAll())
      response.cookies.set(cookie);
    for (const name of ["cache-control", "expires", "pragma"]) {
      const value = sessionResponse.headers.get(name);
      if (value) response.headers.set(name, value);
    }
    if (
      user ||
      req.nextUrl.pathname.startsWith("/tickets/") ||
      req.nextUrl.pathname.startsWith("/event-checkin") ||
      req.nextUrl.pathname.startsWith("/api/event-checkin") ||
      route.protect ||
      req.nextUrl.pathname.startsWith("/api/admin") ||
      req.nextUrl.pathname.startsWith("/auth/") ||
      req.nextUrl.pathname.startsWith("/sign-")
    )
      response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  const adminRequest = isAdminRequest(route.surface, req.nextUrl.pathname);
  const protectedAdminApi =
    req.nextUrl.pathname === "/api/admin" ||
    req.nextUrl.pathname.startsWith("/api/admin/");
  if (route.protect || protectedAdminApi) {
    const userId = user?.email_confirmed_at ? user.id : null;
    if (!userId) {
      if (protectedAdminApi)
        return finish(
          NextResponse.json({ error: "not_signed_in" }, { status: 401 }),
        );
      const visibleUrl = new URL(req.url);
      visibleUrl.host = req.headers.get("host") ?? req.nextUrl.host;
      const signIn = new URL("/sign-in", visibleUrl);
      signIn.searchParams.set("redirect_url", visibleUrl.toString());
      return finish(NextResponse.redirect(signIn));
    }
    // Gate reads and writes before private pages or actions can execute.
    if (adminRequest) {
      const { data, error } = await supabaseAdmin
        .from("users")
        .select("id, role")
        .eq("supabase_auth_user_id", userId)
        .maybeSingle();
      if (error || !isOwnerUser(data))
        return finish(
          NextResponse.json(
            { error: "Owner access required" },
            { status: 403 },
          ),
        );
    }
  }

  // A verified sign-in is not member activation. Check the stored tree link
  // before rendering app pages or executing actions on them.
  const appPage = route.surface === "app" && route.protect;
  if (
    appPage &&
    (req.nextUrl.pathname !== "/pending-assignment" ||
      !["GET", "HEAD"].includes(req.method))
  ) {
    try {
      const account = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("supabase_auth_user_id", user!.id)
        .maybeSingle();
      if (account.error) throw Error("Account lookup unavailable");
      const assigned =
        account.data && (await hasTeamAssignment(account.data.id));
      if (!assigned) {
        if (req.method !== "GET" && req.method !== "HEAD")
          return finish(
            NextResponse.json(
              { error: "tree_assignment_required" },
              { status: 403 },
            ),
          );
        return finish(
          NextResponse.redirect(new URL("/pending-assignment", req.url)),
        );
      }
    } catch {
      return finish(
        NextResponse.json(
          { error: "Member access could not be checked" },
          { status: 503 },
        ),
      );
    }
  }

  const headers = new Headers(req.headers);
  // Always overwrite this header; callers cannot choose their shell.
  headers.set("x-whatelz-surface", route.surface);
  const response = route.rewrite
    ? NextResponse.rewrite(
        new URL(route.rewrite + req.nextUrl.search, req.url),
        { request: { headers } },
      )
    : NextResponse.next({ request: { headers } });
  if (route.surface !== "public")
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return finish(response);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)((?!inngest|oauth).)*",
  ],
};
