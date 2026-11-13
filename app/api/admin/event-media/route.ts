import { randomUUID } from "node:crypto";
import { dailyOwner } from "@/lib/daily/server";
import { supabaseAdmin as db } from "@/lib/supabase-server";
import { EVENT_KEY } from "@/lib/event-tickets";
import {
  EVENT_MEDIA_BUCKET,
  eventMediaAdminHost,
  mediaInput,
  validEventMediaPath,
  mediaDescription,
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
  const requestedPath = new URL(req.url).searchParams.get("path");
  if (requestedPath !== null) {
    if (!validEventMediaPath(requestedPath, EVENT_KEY))
      return json({ error: "Invalid media." }, 400);
    const file = await db.storage.from(EVENT_MEDIA_BUCKET).info(requestedPath);
    if (file.error) return json({ error: "Media not found." }, 404);
    const signed = await db.storage
      .from(EVENT_MEDIA_BUCKET)
      .createSignedUrl(requestedPath, 600);
    if (signed.error || !signed.data)
      return json({ error: "Preview unavailable. Retry." }, 503);
    return json({ url: signed.data.signedUrl });
  }
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
  const metadata = await db
    .from("event_media_assets")
    .select("storage_path,title,description,people,revision")
    .eq("event_key", EVENT_KEY)
    .in("storage_path", paths);
  if (metadata.error)
    return json({ error: "Media details unavailable. Retry." }, 503);
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
      title:
        metadata.data.find((m) => m.storage_path === paths[i])?.title || "",
      description:
        metadata.data.find((m) => m.storage_path === paths[i])?.description ||
        "",
      people:
        metadata.data.find((m) => m.storage_path === paths[i])?.people || [],
      revision:
        metadata.data.find((m) => m.storage_path === paths[i])?.revision || 0,
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

export async function PATCH(req: Request) {
  if (
    req.headers.get("origin") !== new URL(req.url).origin ||
    !eventMediaAdminHost(req)
  )
    return json({ error: "Owner Admin access required." }, 403);
  let owner: string;
  try {
    owner = await dailyOwner();
  } catch {
    return json({ error: "Owner Admin access required." }, 403);
  }
  let input;
  try {
    const text = await req.text();
    if (text.length > 6000) throw Error();
    input = mediaDescription(JSON.parse(text));
    if (!validEventMediaPath(input.path, EVENT_KEY)) throw Error();
  } catch {
    return json({ error: "Check the media details and retry." }, 400);
  }
  const object = await db.storage
    .from(EVENT_MEDIA_BUCKET)
    .info(input.path as string);
  if (object.error) return json({ error: "Media not found." }, 404);
  const payload = {
    title: input.title,
    description: input.description,
    people: input.people,
    revision: input.revision + 1,
    updated_by: owner,
    updated_at: new Date().toISOString(),
  };
  const query =
    input.revision === 0
      ? db
          .from("event_media_assets")
          .insert({
            ...payload,
            event_key: EVENT_KEY,
            storage_path: input.path,
          })
      : db
          .from("event_media_assets")
          .update(payload)
          .eq("event_key", EVENT_KEY)
          .eq("storage_path", input.path)
          .eq("revision", input.revision);
  const result = await query
    .select("title,description,people,revision")
    .maybeSingle();
  if (result.error?.code === "23505" || (!result.error && !result.data))
    return json(
      { error: "Details changed elsewhere. Refresh media before saving." },
      409,
    );
  if (result.error)
    return json({ error: "Details could not be saved. Retry." }, 503);
  return json(result.data);
}
