// Public projection only: never spread database metadata or internal notes.
export type EventTopic = "ai" | "money" | "combined";
export type EventFormat = "weekly" | "sharing" | "intensive";
export type CatalogRow = {
  id: string;
  type: string;
  slug: string | null;
  name: string;
  date: string | null;
  location: string | null;
  published: boolean;
  metadata: Record<string, unknown>;
};
export type CatalogEvent = {
  id: string;
  recordId: string;
  key: string | null;
  slug: string | null;
  path: string;
  legacyPath: string | null;
  title: string;
  date: string;
  dateLabel: string;
  startsAt: string | null;
  endsAt: string | null;
  timeLabel: string | null;
  venue: string | null;
  address: string | null;
  venueUrl: string | null;
  poster: string | null;
  posterWidth: number;
  posterHeight: number;
  topic: EventTopic;
  format: EventFormat;
  listed: boolean;
  capacity: number | null;
  attended: number | null;
  priceMinor: number | null;
  originalPriceMinor?: number | null;
  description: string;
  heading: string | null;
  paragraphs: string[];
  agenda: { time: string; activity: string }[];
  reminder: string | null;
  registrationUrl: string | null;
};
const text = (value: unknown, max = 2000) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
const num = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
const timestamp = (value: unknown) => {
  const t = text(value, 64);
  return t && Number.isFinite(Date.parse(t)) ? t : null;
};
export function safeEventPath(value: unknown) {
  const p = text(value, 180);
  return p &&
    /^\/events\/[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(p) &&
    !["/events/next", "/events/register"].includes(p)
    ? p
    : null;
}
function httpsUrl(value: unknown) {
  const s = text(value, 500);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === "https:" && !u.username && !u.password
      ? u.href
      : null;
  } catch {
    return null;
  }
}
export function safePoster(value: unknown) {
  const s = text(value, 600);
  if (!s || s.includes("..") || s.includes("%") || s.includes("\\"))
    return null;
  if (/^\/images\/events\/[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp)$/.test(s))
    return s;
  try {
    const u = new URL(s);
    return u.protocol === "https:" &&
      /^[a-z0-9]+\.supabase\.co$/.test(u.hostname) &&
      u.pathname.startsWith("/storage/v1/object/public/") &&
      !u.search &&
      !u.hash
      ? u.href
      : null;
  } catch {
    return null;
  }
}
export function projectEvent(row: CatalogRow): CatalogEvent | null {
  const m = row.metadata || {};
  if (
    !row.published ||
    !["training", "workshop", "talk"].includes(row.type) ||
    m.superseded_by ||
    ["duplicate", "cancelled", "draft"].includes(String(m.status)) ||
    !row.date ||
    !/^\d{4}-\d{2}-\d{2}$/.test(row.date) ||
    !Number.isFinite(Date.parse(row.date))
  )
    return null;
  const id = text(m.event_id, 100) || row.id;
  const startsAt = timestamp(m.starts_at),
    endsAt = timestamp(m.ends_at);
  const format: EventFormat =
    m.event_format === "intensive"
      ? "intensive"
      : m.event_format === "sharing"
        ? "sharing"
        : "weekly";
  const topic: EventTopic =
    m.topic === "ai" ? "ai" : m.topic === "money" ? "money" : "combined";
  const content =
    m.public_content &&
    typeof m.public_content === "object" &&
    !Array.isArray(m.public_content)
      ? (m.public_content as Record<string, unknown>)
      : {};
  const paragraphs = Array.isArray(content.paragraphs)
    ? content.paragraphs
        .flatMap((p) => {
          const v = text(p, 3000);
          return v ? [v] : [];
        })
        .slice(0, 10)
    : [];
  const agenda = Array.isArray(content.agenda)
    ? content.agenda
        .flatMap((a) => {
          if (!a || typeof a !== "object") return [];
          const time = text(a.time, 80),
            activity = text(a.activity, 160);
          return time && activity ? [{ time, activity }] : [];
        })
        .slice(0, 8)
    : [];
  const description =
    text(m.public_description, 500) ||
    text(m.description, 500) ||
    "Learning, questions and practical ideas with Edmund.";
  return {
    id,
    recordId: row.id,
    key: text(m.event_key, 160),
    slug: row.slug,
    path: `/events/${/^[A-Za-z0-9-]{1,100}$/.test(id) ? id : row.id}`,
    legacyPath: safeEventPath(m.public_path),
    title: row.name,
    date: row.date,
    dateLabel: new Date(row.date + "T12:00:00+08:00").toLocaleDateString(
      "en-SG",
      {
        timeZone: "Asia/Singapore",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    ),
    startsAt,
    endsAt,
    timeLabel:
      startsAt && endsAt
        ? `${new Date(startsAt).toLocaleTimeString("en-SG", { timeZone: "Asia/Singapore", hour: "numeric", minute: "2-digit" })}–${new Date(endsAt).toLocaleTimeString("en-SG", { timeZone: "Asia/Singapore", hour: "numeric", minute: "2-digit" })} · Singapore time`
        : null,
    venue: text(m.public_venue, 200) || row.location,
    address: text(m.public_address, 300),
    venueUrl: httpsUrl(m.public_venue_url),
    poster: safePoster(m.public_poster),
    posterWidth: num(m.poster_width) || 1080,
    posterHeight: num(m.poster_height) || 1440,
    topic,
    format,
    listed:
      m.public_visibility === "listed" ||
      (m.public_visibility !== "unlisted" && format !== "intensive"),
    capacity: num(m.capacity),
    attended: null,
    originalPriceMinor: num(m.reference_price_minor),
    priceMinor:
      m.currency === "SGD" && num(m.price_minor) !== null
        ? num(m.price_minor)
        : format === "weekly" && (m.topic === "ai" || m.topic === "money")
          ? 800
          : null,
    description,
    heading: text(content.heading, 160),
    paragraphs,
    agenda,
    reminder: text(content.reminder, 300),
    registrationUrl: null,
  };
}
export function eventStarts(event: CatalogEvent) {
  return Date.parse(event.startsAt || event.date + "T00:00:00+08:00");
}
export function eventEnds(event: CatalogEvent) {
  return Date.parse(event.endsAt || event.date + "T23:59:59.999+08:00");
}
export function pastEvents(events: CatalogEvent[], now = Date.now()) {
  return events
    .filter((e) => e.listed && eventEnds(e) <= now)
    .sort(
      (a, b) =>
        eventEnds(b) - eventEnds(a) || a.recordId.localeCompare(b.recordId),
    );
}
export function upcomingEvents(events: CatalogEvent[], now = Date.now()) {
  return events
    .filter((e) => e.listed && eventStarts(e) > now)
    .sort(
      (a, b) =>
        eventStarts(a) - eventStarts(b) || a.recordId.localeCompare(b.recordId),
    );
}
export function nextWeeklyEvent(events: CatalogEvent[], now = Date.now()) {
  return upcomingEvents(events, now).find((e) => e.format === "weekly") || null;
}
export function resolveEvent(events: CatalogEvent[], alias: string) {
  const exact = events.filter(
    (e) =>
      e.id === alias ||
      e.recordId === alias ||
      e.slug === alias ||
      e.path === `/events/${alias}` ||
      e.legacyPath === `/events/${alias}`,
  );
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return null;
  const dated = events.filter((e) => e.date === alias);
  return dated.length === 1 ? dated[0] : null;
}
export const topicLabel = (topic: EventTopic) =>
  topic === "ai"
    ? "AI Skillset"
    : topic === "money"
      ? "Money Mindset"
      : "Money Mindset × AI Skillset";
export const priceLabel = (minor: number) =>
  new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    maximumFractionDigits: minor % 100 === 0 ? 0 : 2,
  })
    .format(minor / 100)
    .replace("$", "S$");
