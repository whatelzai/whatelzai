import { checkEventPush } from "@/lib/admin-push/event-server";
import { validPushCronBearer } from "@/lib/admin-push/cron-auth";
import { checkRoutinePush, checkFocusPush } from "@/lib/admin-push/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization") || "";
  if (!validPushCronBearer(supplied, secret))
    return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  if (process.env.VERCEL_ENV !== "production")
    return Response.json(
      { error: "Production only" },
      { status: 503, headers },
    );
  try {
    const now = new Date();
    const results = await Promise.allSettled([
      checkFocusPush(now),
      checkEventPush(now),
      now.getUTCMinutes() % 5 === 0
        ? checkRoutinePush()
        : Promise.resolve({ skipped: true }),
    ]);
    if (results.some((result) => result.status === "rejected"))
      throw Error("push_check_failed");
    return Response.json(
      {
        focus: results[0].status === "fulfilled" ? results[0].value : null,
        events: results[1].status === "fulfilled" ? results[1].value : null,
        routines: results[2].status === "fulfilled" ? results[2].value : null,
      },
      { headers },
    );
  } catch {
    console.error(
      "Admin push check failed; inspect owner notification settings.",
    );
    return Response.json(
      { error: "Notification check needs attention" },
      { status: 503, headers },
    );
  }
}
export async function HEAD() {
  return new Response(null, { status: 405 });
}
