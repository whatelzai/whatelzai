import { randomUUID } from "node:crypto";
import { dailyOwner } from "@/lib/daily/server";
import { supabaseAdmin as db } from "@/lib/supabase-server";
import { EVENT_KEY } from "@/lib/event-tickets";
import {
  EVENT_MEDIA_BUCKET,
  eventMediaAdminHost,
  mediaInput,
} from "@/lib/event-admin/media-policy";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers });
async function authorized(req: Request) {
  if (!eventMediaAdminHost(req)) return false;
  try {
    await dailyOwner();
    return true;
  } catch {
    return false;
  }
}
export async function GET(req: Request) {
  if (!(await authorized(req)))
    return json({ error: "Owner Admin access required." }, 403);
  const offset = Number(new URL(req.url).searchParams.get("offset") || 0);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 10000)
    return json({ error: "Invalid page." }, 400);
  const { data, error } = await db.storage
    .from(EVENT_MEDIA_BUCKET)
    .list(EVENT_KEY, {
      limit: 25,
      offset,
      sortBy: { column: "created_at", order: "desc" },
    });
  if (error) return json({ error: "Media unavailable. Retry." }, 503);
  const files = (data || []).filter((f) => f.id);
  if (!files.length) return json({ files: [], more: false });
  const paths = files.map((f) => `${EVENT_KEY}/${f.name}`);
  const signed = await db.storage
    .from(EVENT_MEDIA_BUCKET)
    .createSignedUrls(paths, 600);
  if (signed.error || !signed.data || signed.data.some((f) => f.error))
    return json({ error: "Media previews unavailable. Retry." }, 503);
  return json({
    files: files.map((f, i) => ({
      path: paths[i],
      name: f.name.slice(37),
      type: f.metadata?.mimetype || "",
      size: f.metadata?.size || 0,
      url: signed.data[i].signedUrl,
    })),
    more: data?.length === 25,
  });
}
export async function POST(req: Request) {
  if (
    req.headers.get("origin") !== new URL(req.url).origin ||
    !(await authorized(req))
  )
    return json({ error: "Owner Admin access required." }, 403);
  let file;
  try {
    const body = await req.text();
    if (body.length > 2048) throw Error();
    file = mediaInput(JSON.parse(body));
  } catch {
    return json(
      { error: "Choose a supported photo or video up to 50 MB." },
      400,
    );
  }
  const path = `${EVENT_KEY}/${randomUUID()}-${file.name}`;
  const { data, error } = await db.storage
    .from(EVENT_MEDIA_BUCKET)
    .createSignedUploadUrl(path, { upsert: false });
  if (error || !data)
    return json({ error: "Upload could not start. Retry." }, 503);
  return json({ path, token: data.token });
}
