import { eventReference, type PortfolioEvent } from "../event-portfolio";
import { seminarByKey } from "../public-events/map";

export function adminOccurrence(row: PortfolioEvent) {
  const m = row.metadata;
  const key = eventReference(row);
  const legacy = seminarByKey(key);
  const id = String(m.event_id || legacy?.id || row.id);
  const startsAt = String(
    m.starts_at || (row.date ? row.date + "T12:00:00+08:00" : ""),
  );
  const dateLabel = Number.isFinite(Date.parse(startsAt))
    ? new Date(startsAt).toLocaleDateString("en-SG", {
        day: "numeric",
        month: "short",
        timeZone: "Asia/Singapore",
      })
    : "Date to confirm";
  const files = Object.keys(m.poster_files || {});
  const format = ["original", "post", "story"].find((f) => files.includes(f));
  return {
    id,
    key,
    startsAt,
    dateLabel,
    title: row.name,
    shortName: row.name,
    capacity: typeof m.capacity === "number" ? m.capacity : legacy?.capacity,
    poster: format
      ? "/api/admin/event-poster?event=" + row.id + "&format=" + format
      : typeof m.public_poster === "string" &&
          m.public_poster.startsWith("/images/")
        ? m.public_poster
        : legacy?.poster || "",
    path: row.published ? "/events/" + encodeURIComponent(id) : "",
    venue:
      key === "ai-skillset-money-mindset-20261201"
        ? "Near Paya Lebar MRT"
        : row.location || "",
    address: "",
    timeLabel:
      legacy?.timeLabel ||
      (typeof m.starts_at === "string" && typeof m.ends_at === "string"
        ? [m.starts_at, m.ends_at]
            .map((v) =>
              new Date(v).toLocaleTimeString("en-SG", {
                hour: "numeric",
                minute: "2-digit",
                timeZone: "Asia/Singapore",
              }),
            )
            .join("–")
        : ""),
    price:
      typeof m.price_minor === "number"
        ? String(m.currency || "SGD") + " " + (m.price_minor / 100).toFixed(2)
        : "",
  };
}
export type AdminOccurrence = ReturnType<typeof adminOccurrence>;
