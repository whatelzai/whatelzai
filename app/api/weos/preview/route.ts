import { siteSurface } from "@/lib/domain-routing";
import { NextRequest, NextResponse } from "next/server";
import { ensureUserRow } from "@/lib/users";
import { isOwnerUser } from "@/lib/admin-policy";
import { PREVIEW_COOKIE } from "@/lib/weos-roles";
export async function POST(req: NextRequest) {
  if (siteSurface(req.headers.get("host") ?? req.nextUrl.host) !== "app")
    return NextResponse.json(
      { error: "Use the weOS app to preview roles" },
      { status: 403 },
    );
  if (req.headers.get("origin") !== req.nextUrl.origin)
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const user = await ensureUserRow();
  if (!isOwnerUser(user))
    return NextResponse.json({ error: "Beacon required" }, { status: 403 });
  const data = await req.json().catch(() => null);
  if (!["beacon", "blaze", "torch", "ember"].includes(data?.role))
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    PREVIEW_COOKIE,
    data.role === "beacon" ? "" : data.role,
    {
      httpOnly: true,
      secure: req.nextUrl.protocol === "https:",
      sameSite: "strict",
      path: "/",
      maxAge: data.role === "beacon" ? 0 : 3600,
    },
  );
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
