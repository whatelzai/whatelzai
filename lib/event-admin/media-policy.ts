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
