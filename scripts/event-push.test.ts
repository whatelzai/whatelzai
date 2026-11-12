import test from "node:test";
import assert from "node:assert/strict";
import {
  eventPushCandidate,
  deliverEventPush,
  EVENT_PUSH_START,
  EVENT_PUSH_LOOKBACK,
  type EventPushTicket,
} from "../lib/admin-push/events";
const now = new Date(Date.parse(EVENT_PUSH_START) + 60000),
  enabled = new Date(Date.parse(EVENT_PUSH_START) - 1000).toISOString();
const ticket = (id = "opaque-ticket"): EventPushTicket => ({
  id,
  status: "confirmed",
  created_at: EVENT_PUSH_START,
});
test("only confirmed tickets since the request and device opt-in are eligible", () => {
  assert.ok(eventPushCandidate(ticket(), enabled, now));
  for (const t of [
    { ...ticket(), status: "reserved" },
    { ...ticket(), status: "cancelled" },
    { ...ticket(), created_at: enabled },
    { ...ticket(), created_at: "invalid" },
    { ...ticket(), created_at: new Date(+now + 1).toISOString() },
  ])
    assert.equal(eventPushCandidate(t, enabled, now), null);
  assert.equal(eventPushCandidate(ticket(), now.toISOString(), now), null);
  assert.equal(
    eventPushCandidate(ticket(), enabled, new Date(+now + EVENT_PUSH_LOOKBACK)),
    null,
  );
});
test("notification is generic and carries no raw ticket capability, identity or contact details", () => {
  const c = eventPushCandidate(ticket(), enabled, now)!;
  assert.equal(c.url, "/event-checkin");
  assert.equal(c.title, "New event registration confirmed");
  assert.ok(!c.tag.includes("opaque-ticket"));
  assert.ok(
    !JSON.stringify({ title: c.title, url: c.url, tag: c.tag }).includes(
      "opaque-ticket",
    ),
  );
});
test("successful receipts and exhausted retries never send again; claims serialize workers", async () => {
  let sent = 0;
  const c = eventPushCandidate(ticket(), enabled, now)!;
  await deliverEventPush(
    [ticket()],
    enabled,
    now,
    [{ document_path: c.path, status: "sent", attempts: 1 }],
    {
      claim: async () => {
        throw Error("should not claim");
      },
      send: async () => {
        sent++;
        return true;
      },
      save: async () => {},
    },
  );
  assert.equal(sent, 0);
  await deliverEventPush(
    [ticket()],
    enabled,
    now,
    [{ document_path: c.path, status: "failed", attempts: 3 }],
    {
      claim: async () => {
        throw Error("exhausted");
      },
      send: async () => true,
      save: async () => {},
    },
  );
  const claims = new Set();
  const ports = {
    claim: async (p: string) => {
      if (claims.has(p)) return false;
      claims.add(p);
      return true;
    },
    send: async () => {
      sent++;
      return true;
    },
    save: async () => {},
  };
  await Promise.all([
    deliverEventPush([ticket()], enabled, now, [], ports),
    deliverEventPush([ticket()], enabled, now, [], ports),
  ]);
  assert.equal(sent, 1);
});
test("transport failures persist failed state and successful sends get receipts", async () => {
  const saved: boolean[] = [];
  const r = await deliverEventPush(
    [ticket("one"), ticket("two")],
    enabled,
    now,
    [],
    {
      claim: async () => true,
      send: async (n) => {
        if (n.tag === eventPushCandidate(ticket("one"), enabled, now)!.tag)
          throw Error("network");
        return true;
      },
      save: async (_, ok) => {
        saved.push(ok);
      },
    },
  );
  assert.deepEqual(r, { sent: 1, failed: 1 });
  assert.deepEqual(saved, [false, true]);
});
test("per-device batch bounds work; a declined lease sends nothing", async () => {
  let n = 0;
  const rows = Array.from({ length: 25 }, (_, i) => ticket(String(i)));
  const r = await deliverEventPush(rows, enabled, now, [], {
    claim: async () => true,
    send: async () => {
      n++;
      return true;
    },
    save: async () => {},
  });
  assert.equal(n, 20);
  assert.equal(r.sent, 20);
  const declined = await deliverEventPush([ticket()], enabled, now, [], {
    claim: async () => false,
    send: async () => {
      throw Error("no lease");
    },
    save: async () => {
      throw Error("no receipt");
    },
  });
  assert.equal(declined.sent, 0);
});
