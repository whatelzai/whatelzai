import { createHash } from "node:crypto";
// Start with this request, not a burst of historical registration alerts.
export const EVENT_PUSH_START = "2026-11-11T12:48:30.000Z";
export const EVENT_PUSH_LOOKBACK = 7 * 24 * 60 * 60 * 1000;
export type EventPushTicket = {
  id: string;
  status: string;
  created_at: string;
};
export function eventPushCandidate(
  ticket: EventPushTicket,
  enabledAt: string,
  now: Date,
) {
  const created = Date.parse(ticket.created_at),
    enabled = Date.parse(enabledAt),
    time = now.getTime();
  if (
    ticket.status !== "confirmed" ||
    !Number.isFinite(created) ||
    !Number.isFinite(enabled) ||
    !Number.isFinite(time) ||
    created <
      Math.max(
        Date.parse(EVENT_PUSH_START),
        enabled,
        time - EVENT_PUSH_LOOKBACK,
      ) ||
    created > time
  )
    return null;
  return {
    path: `event-registration/${ticket.id}`,
    hash: createHash("sha256").update(ticket.id).digest("hex"),
    title: "New event registration confirmed",
    url: "/event-checkin",
    tag: `event-${createHash("sha256").update(ticket.id).digest("hex").slice(0, 24)}`,
  };
}
export type EventDelivery = {
  document_path: string;
  status: string;
  attempts: number;
};
export async function deliverEventPush(
  tickets: EventPushTicket[],
  enabledAt: string,
  now: Date,
  history: EventDelivery[],
  ports: {
    claim: (path: string, hash: string) => Promise<boolean>;
    send: (notice: {
      title: string;
      url: string;
      tag: string;
    }) => Promise<boolean>;
    save: (path: string, ok: boolean) => Promise<void>;
  },
) {
  const old = new Map(history.map((d) => [d.document_path, d]));
  let sent = 0,
    failed = 0,
    claimed = 0;
  for (const ticket of tickets) {
    const c = eventPushCandidate(ticket, enabledAt, now);
    if (!c) continue;
    const previous = old.get(c.path);
    if (previous?.status === "sent" || (previous?.attempts ?? 0) >= 3) continue;
    if (claimed >= 20) break;
    if (!(await ports.claim(c.path, c.hash))) continue;
    claimed++;
    let ok = false;
    try {
      ok = await ports.send(c);
    } catch {
      ok = false;
    }
    await ports.save(c.path, ok);
    if (ok) sent++;
    else failed++;
  }
  return { sent, failed };
}
