import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { focusPushCandidate } from "../lib/admin-push/focus";
import { DEFAULT_FOCUS } from "../lib/admin-focus";
import { validPushCronBearer } from "../lib/admin-push/cron-auth";
import { PGlite } from "@electric-sql/pglite";
import {
  routineCandidates,
  notificationPayload,
  savedRoutineReady,
  trustedPushEndpoint,
  pushSubscriptionSchema,
} from "../lib/admin-push/model";

test("push endpoints reject arbitrary/loopback hosts, credentials and deceptive suffixes", () => {
  for (const url of [
    "https://fcm.googleapis.com/fcm/send/example",
    "https://web.push.apple.com/example",
    "https://updates.push.services.mozilla.com/wpush/v2/example",
    "https://wns2-test.notify.windows.com/w/?token=example",
  ])
    assert(trustedPushEndpoint(url));
  for (const url of [
    "http://fcm.googleapis.com/test",
    "https://fcm.googleapis.com.evil.test/a",
    "https://127.0.0.1/a",
    "https://localhost/a",
    "https://web.push.apple.com:8080/a",
    "https://u:p@web.push.apple.com/a",
    "https://evil.test/",
    "https://web.push.apple.com/a#fragment",
  ])
    assert(!trustedPushEndpoint(url), url);
  assert(
    !pushSubscriptionSchema.safeParse({
      endpoint: "https://web.push.apple.com/a",
      keys: { p256dh: "bad", auth: "bad" },
    }).success,
  );
});
test("Singapore dates and ISO weekly rollover select the exact canonical sources", () => {
  const candidates = routineCandidates(new Date("2027-01-03T20:00:00Z"));
  assert(candidates[0].path.endsWith("01-morning/2027-01-04-MORNING.md"));
  assert(candidates[1].path.endsWith("02-evening/2027-01-04-EVENING.md"));
  assert(candidates[2].path.endsWith("03-weeks/WEEK-2026-W53.md"));
});
test("readiness needs actual Notes, timestamp evidence and a post-opt-in saved version", () => {
  const now = new Date().toISOString();
  const doc = {
    content:
      "# Daily\n## Notes\n\n### Morning brief\n" +
      "A verified reflection and a concrete proposal. ".repeat(5),
    last_edited_at: now,
  };
  assert(savedRoutineReady(doc, "2000-01-01T00:00:00Z"));
  assert(!savedRoutineReady({ ...doc, content: "# Daily\n## Notes\n\n" }, now));
  assert(!savedRoutineReady({ ...doc, last_edited_at: "invalid" }, now));
  assert(
    !savedRoutineReady({ ...doc, last_edited_at: "2000-01-01T00:00:00Z" }, now),
  );
  assert(!savedRoutineReady({ content: doc.content }, now));
});
test("worker shows generic notifications and confines clicks to Admin destinations", async () => {
  type WorkerEvent = {
    data?: { json: () => unknown };
    notification?: { close: () => void; data: { url: string } };
    waitUntil: (p: Promise<unknown>) => void;
  };
  type Notice = { body: string; data: { url: string } };
  const handlers: Record<string, (event: WorkerEvent) => void> = {};
  let shown: Notice & { title: string } = {
    title: "",
    body: "",
    data: { url: "" },
  };
  let opened = "";
  const self = {
    location: { origin: "https://admin.whatelz.ai" },
    addEventListener: (name: string, fn: (event: WorkerEvent) => void) =>
      (handlers[name] = fn),
    registration: {
      showNotification: async (title: string, options: Notice) => {
        shown = { title, ...options };
      },
    },
    clients: {
      matchAll: async () => [],
      openWindow: async (url: string) => {
        opened = url;
      },
    },
  };
  vm.runInNewContext(
    await readFile(new URL("../public/admin-sw.js", import.meta.url), "utf8"),
    { self, URL, Response, fetch },
  );
  let wait: Promise<unknown> | undefined;
  handlers.push({
    data: {
      json: () => ({
        title: "Your morning brief is ready",
        body: "PRIVATE CONTENT",
        url: "https://evil.test/steal",
        tag: "morning",
      }),
    },
    waitUntil: (p: Promise<unknown>) => (wait = p),
  });
  await wait;
  assert.equal(shown.title, "Your morning brief is ready");
  assert(!shown.body.includes("PRIVATE"));
  assert.equal(shown.data.url, "https://admin.whatelz.ai/today");
  handlers.push({
    data: {
      json: () => ({
        title: "Time for Personal",
        url: "/personal",
        tag: "focus-test",
        body: "PRIVATE CONTENT",
      }),
    },
    waitUntil: (p: Promise<unknown>) => (wait = p),
  });
  await wait;
  assert.equal(shown.title, "Time for Personal");
  assert.equal(shown.data.url, "https://admin.whatelz.ai/personal");
  assert.equal(shown.body, "Open your scheduled space.");
  handlers.push({
    data: {
      json: () => ({
        title: "New event registration confirmed",
        url: "/event-checkin",
        tag: "event-hash",
        body: "PRIVATE PERSON",
      }),
    },
    waitUntil: (p) => (wait = p),
  });
  await wait;
  assert.equal(shown.title, "New event registration confirmed");
  assert.equal(shown.body, "Open registrations in Whatelz Admin.");
  assert.equal(shown.data.url, "https://admin.whatelz.ai/event-checkin");
  handlers.notificationclick({
    notification: { close() {}, data: { url: "/event-checkin" } },
    waitUntil: (p) => (wait = p),
  });
  await wait;
  assert.equal(opened, "https://admin.whatelz.ai/event-checkin");
  handlers.notificationclick({
    notification: { close() {}, data: { url: "/api/admin/tokens" } },
    waitUntil: (p: Promise<unknown>) => (wait = p),
  });
  await wait;
  assert.equal(opened, "https://admin.whatelz.ai/today");
});
test("SQL denies browser roles, deduplicates completed documents and bounds lease retries", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon;create role authenticated;create role service_role;create table public.users(id uuid primary key);",
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20261024072128_admin_push_subscriptions.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20261024085717_admin_focus_push.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const owner = "00000000-0000-0000-0000-000000000001";
    const device = "00000000-0000-0000-0000-000000000002";
    await db.query("insert into users values($1)", [owner]);
    await db.query(
      "insert into admin_push_subscriptions(id,owner_id,endpoint_hash,encrypted_subscription) values($1,$2,$3,'encrypted')",
      [device, owner, "a".repeat(64)],
    );
    const claim = async () =>
      (
        await db.query<{ claimed: boolean }>(
          "select claim_admin_push($1,'daily.md','hash') as claimed",
          [device],
        )
      ).rows[0].claimed;
    assert(await claim());
    assert.equal(await claim(), false);
    await db.exec(
      "update admin_push_deliveries set attempted_at=now()-interval '11 minutes',status='failed'",
    );
    assert(await claim());
    await db.exec(
      "update admin_push_deliveries set attempted_at=now()-interval '11 minutes',status='failed'",
    );
    assert(await claim());
    await db.exec(
      "update admin_push_deliveries set attempted_at=now()-interval '11 minutes',status='failed'",
    );
    assert.equal(await claim(), false);
    await db.exec("update admin_push_deliveries set status='sent'");
    assert.equal(await claim(), false);
    await db.exec("update admin_push_subscriptions set enabled=false");
    assert.equal(
      (
        await db.query<{ claimed: boolean }>(
          "select claim_admin_push($1,'other.md','hash') as claimed",
          [device],
        )
      ).rows[0].claimed,
      false,
    );
    const permissions = await db.query<{
      readable: boolean;
      callable: boolean;
    }>(
      "select has_table_privilege('authenticated','admin_push_subscriptions','select') as readable,has_function_privilege('anon','claim_admin_push(uuid,text,text)','execute') as callable",
    );
    assert.equal(permissions.rows[0].readable, false);
    assert.equal(permissions.rows[0].callable, false);
    const rls = await db.query<{ relrowsecurity: boolean }>(
      "select relrowsecurity from pg_class where relname in ('admin_push_subscriptions','admin_push_deliveries','admin_push_state')",
    );
    assert(rls.rows.every((r) => r.relrowsecurity));
  } finally {
    await db.close();
  }
});

test("cron bearer rejects missing, wrong and multibyte credentials without throwing", () => {
  assert(validPushCronBearer("Bearer example", "example"));
  assert(!validPushCronBearer("Bearer wrong", "example"));
  assert(!validPushCronBearer("Bearer exämple", "example"));
  assert(!validPushCronBearer("", undefined));
});

test("browser subscription JSON accepts its standard nullable expiration field", () => {
  const parsed = pushSubscriptionSchema.safeParse({
    endpoint: "https://web.push.apple.com/example",
    expirationTime: null,
    keys: {
      p256dh: Buffer.alloc(65).toString("base64url"),
      auth: Buffer.alloc(16).toString("base64url"),
    },
  });
  assert(parsed.success);
});

test("push payload excludes source paths and arbitrary private fields", () => {
  const notice = {
    ...routineCandidates()[0],
    privateBody: "private reflection",
  };
  const payload = notificationPayload(notice);
  assert.deepEqual(Object.keys(payload).sort(), [
    "body",
    "tag",
    "title",
    "url",
  ]);
  assert(!JSON.stringify(payload).includes(notice.path));
  assert(!JSON.stringify(payload).includes(notice.privateBody));
});

test("focus alerts follow Singapore transitions, including Overview, without stale catch-up", () => {
  const since = "2026-10-20T00:00:00Z";
  const at = (time: string) => focusPushCandidate(new Date(time), null, since);
  assert.equal(at("2026-10-23T00:00:00Z"), null); // Overview remains Overview
  assert.equal(at("2026-10-23T01:00:00Z")?.url, "/day-job");
  assert.equal(at("2026-10-23T10:00:00Z")?.url, "/");
  assert.equal(at("2026-10-23T11:00:00Z")?.title, "Time for Network Marketing");
  assert.equal(at("2026-10-23T14:00:00Z")?.url, "/");
  assert.equal(at("2026-10-24T01:00:00Z")?.url, "/ai-business");
  assert.equal(at("2026-10-24T10:00:00Z")?.title, "Time for Overview");
  assert.equal(at("2026-10-23T16:00:00Z"), null); // midnight is still Overview
  assert.equal(at("2026-10-23T10:04:59Z")?.title, "Time for Overview");
  assert.equal(at("2026-10-23T00:05:00Z"), null);
  assert.equal(at("2026-10-23T00:59:59Z"), null);
});
test("focus alerts respect per-device pause, edits, opt-in time and malformed schedules", () => {
  const now = new Date("2026-10-23T00:01:00Z");
  assert.equal(
    focusPushCandidate(
      now,
      { ...DEFAULT_FOCUS, enabled: false },
      "2026-10-20Z",
    ),
    null,
  );
  assert.equal(focusPushCandidate(now, null, "2026-10-23T00:00:01Z"), null);
  assert.equal(focusPushCandidate(now, null, "bad"), null);
  assert.equal(focusPushCandidate(now, { enabled: true }, "2026-10-20Z"), null);
  const custom = {
    ...DEFAULT_FOCUS,
    blocks: [
      {
        days: "weekdays" as const,
        start: 480,
        end: 540,
        space: "AI Business" as const,
      },
    ],
  };
  assert.equal(
    focusPushCandidate(now, custom, "2026-10-20T00:00:00Z")?.url,
    "/ai-business",
  );
});
