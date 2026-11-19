import { timingSafeEqual } from "node:crypto";
import { runWeekly } from "@/lib/daily/weekly";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (
    !secret ||
    Buffer.byteLength(supplied) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  )
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  const owner = process.env.WHATELZ_OWNER_USER_ID;
  if (!owner || process.env.VERCEL_ENV !== "production")
    return Response.json({ error: "Scheduler unavailable" }, { status: 503 });
  try {
    const status = await runWeekly(owner);
    return Response.json(
      { status },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    console.error("Daily weekly summary failed; inspect owner run status.");
    return Response.json(
      { error: "Weekly summary needs attention" },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
// Prevent Next's implicit HEAD handler from invoking the scheduled mutation.
export async function HEAD() {
  return new Response(null, { status: 405 });
}
