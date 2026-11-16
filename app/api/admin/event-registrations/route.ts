import { currentEvent, seminarById } from "@/lib/public-events/map";
import { eventAdminData } from "@/lib/event-admin/server";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const host = new URL(req.url).hostname;
  const allowed =
    host === "admin.whatelz.ai" ||
    (process.env.NODE_ENV === "development" &&
      ["localhost", "127.0.0.1", "admin.localhost"].includes(host));
  const headers = { "Cache-Control": "private, no-store" };
  if (!allowed)
    return Response.json(
      { error: "Owner Admin access required." },
      { status: 403, headers },
    );
  try {
    const event = seminarById(
      new URL(req.url).searchParams.get("event") ?? currentEvent.id,
    );
    if (!event)
      return Response.json(
        { error: "Event not found." },
        { status: 404, headers },
      );
    return Response.json(await eventAdminData(event.key), { headers });
  } catch {
    return Response.json(
      { error: "Registrations unavailable. Refresh to retry." },
      { status: 503, headers },
    );
  }
}
