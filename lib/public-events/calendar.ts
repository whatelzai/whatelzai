import { eventEnds, type CatalogEvent } from "./catalog";
export type EventBrowseItem = Pick<
  CatalogEvent,
  | "id"
  | "title"
  | "date"
  | "dateLabel"
  | "path"
  | "poster"
  | "posterWidth"
  | "posterHeight"
  | "venue"
  | "timeLabel"
  | "topic"
  | "format"
  | "priceMinor"
  | "attended"
> & { past: boolean };
export function browseItems(
  events: CatalogEvent[],
  now: number,
): EventBrowseItem[] {
  return events
    .filter((e) => e.listed)
    .map((e) => ({
      id: e.id,
      title: e.title,
      date: e.date,
      dateLabel: e.dateLabel,
      path: e.path,
      poster: e.poster,
      posterWidth: e.posterWidth,
      posterHeight: e.posterHeight,
      venue: e.venue,
      timeLabel: e.timeLabel,
      format: e.format,
      topic: e.topic,
      priceMinor: e.priceMinor,
      attended: e.attended,
      past: eventEnds(e) <= now,
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}
export function validMonth(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(value) &&
    Number(value.slice(0, 4)) >= 2000 &&
    Number(value.slice(0, 4)) <= 2100
  );
}
export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
export function monthCells(month: string) {
  const [y, m] = month.split("-").map(Number);
  const start = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((start + length) / 7) * 7 }, (_, i) => {
    const day = i - start + 1;
    return day < 1 || day > length
      ? null
      : `${month}-${String(day).padStart(2, "0")}`;
  });
}
export const monthTitle = (month: string) =>
  new Date(`${month}-01T12:00:00+08:00`).toLocaleDateString("en-SG", {
    timeZone: "Asia/Singapore",
    month: "long",
    year: "numeric",
  });

export const calendarShortLabel = (
  e: Pick<CatalogEvent, "format" | "topic">,
) =>
  e.format === "intensive"
    ? "AMI"
    : e.format === "sharing"
      ? "Talk"
      : e.topic === "ai"
        ? "AI"
        : e.topic === "money"
          ? "MM"
          : "AI+MM";
