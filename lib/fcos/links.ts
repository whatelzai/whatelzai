export function eventHref(month: string, key: string) {
  return `/calendar/event?month=${month}&event=${encodeURIComponent(key)}`;
}
