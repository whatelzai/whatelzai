import { dailyOwner } from "@/lib/daily/server";
import { supabaseAdmin as db } from "@/lib/supabase-server";
import {
  EVENT_MEDIA_BUCKET,
  eventMediaAdminHost,
  validEventMediaPath,
} from "@/lib/event-admin/media-policy";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(req: Request) {
  if (!eventMediaAdminHost(req))
    return Response.json(
      { error: "Owner Admin access required." },
      { status: 403, headers },
    );
  try {
    await dailyOwner();
  } catch {
    return Response.json(
      { error: "Owner Admin access required." },
      { status: 403, headers },
    );
  }
  const params = new URL(req.url).searchParams,
    id = params.get("event") || "",
    format = params.get("format") || "original";
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    ) ||
    !["post", "story", "original"].includes(format)
  )
    return Response.json(
      { error: "Invalid poster." },
      { status: 400, headers },
    );
  const event = await db
    .from("events")
    .select("metadata")
    .eq("id", id)
    .maybeSingle();
  const file = event.data?.metadata?.poster_files?.[format];
  if (event.error || !file || !validEventMediaPath(file.path, id))
    return Response.json(
      { error: "Poster unavailable." },
      { status: 404, headers },
    );
  const signed = await db.storage
    .from(EVENT_MEDIA_BUCKET)
    .createSignedUrl(file.path, 600);
  if (signed.error || !signed.data)
    return Response.json(
      { error: "Poster unavailable. Retry." },
      { status: 503, headers },
    );
  return new Response(null, {
    status: 302,
    headers: { ...headers, Location: signed.data.signedUrl },
  });
}
