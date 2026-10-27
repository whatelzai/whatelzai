export type ReleaseNote = {
  id: number;
  slug: string;
  title: string;
  body: string;
  published_at: string;
};

export type ReleasePosition = { id: number; published_at: string };
export function releaseCursor(value: unknown): ReleasePosition | null {
  if (typeof value !== "string") return null;
  const match =
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)~([1-9]\d{0,14})$/.exec(
      value,
    );
  if (!match) return null;
  const id = Number(match[2]);
  const time = Date.parse(match[1]);
  return Number.isSafeInteger(id) &&
    Number.isFinite(time) &&
    new Date(time).toISOString() === match[1]
    ? { id, published_at: match[1] }
    : null;
}
export function releasePosition(release: ReleasePosition) {
  return `${new Date(release.published_at).toISOString()}~${release.id}`;
}
export function hasNewRelease(
  latest: ReleasePosition,
  seen: ReleasePosition | null,
) {
  if (!seen) return true;
  const latestTime = Date.parse(latest.published_at);
  const seenTime = Date.parse(seen.published_at);
  return (
    latestTime > seenTime || (latestTime === seenTime && latest.id > seen.id)
  );
}
export const releaseDate = (value: string) =>
  new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
