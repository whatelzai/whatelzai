export const EVENT_MEDIA_BUCKET = "event-media-private";
export const EVENT_MEDIA_MAX_BYTES = 50 * 1024 * 1024;
export const EVENT_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
];
export function mediaInput(input: unknown) {
  const f = input as { name?: unknown; size?: unknown; type?: unknown };
  if (
    !f ||
    typeof f.name !== "string" ||
    !f.name.trim() ||
    f.name.length > 200 ||
    typeof f.type !== "string" ||
    !EVENT_MEDIA_TYPES.includes(f.type) ||
    typeof f.size !== "number" ||
    !Number.isSafeInteger(f.size) ||
    f.size < 1 ||
    f.size > EVENT_MEDIA_MAX_BYTES
  )
    throw Error("Choose a supported photo or video up to 50 MB.");
  return {
    name: f.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120),
    size: f.size,
    type: f.type,
  };
}
export function eventMediaAdminHost(req: Request) {
  const host = new URL(req.url).hostname;
  return (
    host === "admin.whatelz.ai" ||
    (process.env.NODE_ENV === "development" &&
      ["localhost", "127.0.0.1", "admin.localhost"].includes(host))
  );
}
export function validEventMediaPath(
  path: unknown,
  eventKey: string,
): path is string {
  if (
    typeof path !== "string" ||
    path.length > 250 ||
    !path.startsWith(eventKey + "/")
  )
    return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-[a-zA-Z0-9._-]+$/.test(
    path.slice(eventKey.length + 1),
  );
}
export function mediaDescription(input: unknown) {
  const f = input as {
    path?: unknown;
    title?: unknown;
    description?: unknown;
    people?: unknown;
    revision?: unknown;
  };
  if (
    !f ||
    typeof f.title !== "string" ||
    f.title.length > 120 ||
    typeof f.description !== "string" ||
    f.description.length > 2000 ||
    !Array.isArray(f.people) ||
    f.people.length > 12 ||
    f.people.some((p) => typeof p !== "string" || p.length > 80 || !p.trim()) ||
    typeof f.revision !== "number" ||
    !Number.isSafeInteger(f.revision) ||
    f.revision < 0 ||
    f.revision >= 2147483647
  )
    throw Error("Check the media details and retry.");
  return {
    path: f.path,
    title: f.title.trim(),
    description: f.description.trim(),
    people: [...new Set(f.people.map((p: string) => p.trim()))],
    revision: f.revision,
  };
}
export type EventMediaFile = {
  path: string;
  name: string;
  type: string;
  size: number;
  url: string;
  title: string;
  description: string;
  people: string[];
  revision: number;
};
