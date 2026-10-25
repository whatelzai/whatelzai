import { NextResponse } from "next/server";
import { ensureUserRow } from "@/lib/users";
import { isOwnerUser } from "@/lib/admin-policy";
import { adminPasskeyOrigin, passkeyDestination } from "@/lib/auth/passkeys";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!adminPasskeyOrigin(url.origin))
    return new Response("Admin host required.", { status: 403 });
  if (!isOwnerUser(await ensureUserRow()))
    return new Response("Owner access required.", {
      status: 403,
      headers: { "Cache-Control": "private, no-store" },
    });
  const response = NextResponse.redirect(
    new URL(passkeyDestination(url.searchParams.get("next")), url.origin),
  );
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
