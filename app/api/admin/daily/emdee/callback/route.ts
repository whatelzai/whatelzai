import { NextResponse } from "next/server";
import { adminUrl } from "@/lib/admin-url";
import { dailyOwner } from "@/lib/daily/server";
import { finishEmdeeConnection } from "@/lib/daily/oauth";
export async function GET(request: Request) {
  const owner = await dailyOwner();
  const url = new URL(request.url);
  try {
    await finishEmdeeConnection(owner, url);
    return NextResponse.redirect(
      new URL(
        adminUrl("/admin/today/connections?result=connected"),
        url.origin,
      ),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.redirect(
      new URL(adminUrl("/admin/today/connections?result=failed"), url.origin),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
