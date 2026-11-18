import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  eventFeedbackInput,
  feedbackPath,
  feedbackOpen,
  feedbackNext,
} from "../lib/event-feedback/model";
import { projectEvent, type CatalogRow } from "../lib/public-events/catalog";
const event = (id: string, date: string, format = "weekly") =>
  projectEvent({
    id,
    type: "talk",
    slug: id,
    name: id,
    date,
    location: "The Vibe",
    published: true,
    metadata: { event_id: id, event_format: format },
  } as CatalogRow)!;
test("legacy feedback parser retains its original bounds for historical compatibility", () => {
  const input = {
    eventId: "ELZ-EVT-0004",
    requestId: "a8fd01ac-8e7a-4b85-849d-29773b7df40b",
    rating: 5,
  };
  assert.equal(eventFeedbackInput.parse(input).comment, "");
  for (const rating of [0, 6, 2.5, "5"])
    assert.equal(
      eventFeedbackInput.safeParse({ ...input, rating }).success,
      false,
    );
  assert.equal(
    eventFeedbackInput.safeParse({ ...input, comment: "x".repeat(1501) })
      .success,
    false,
  );
  assert.equal(
    eventFeedbackInput.safeParse({ ...input, website: "spam" }).success,
    false,
  );
  assert.equal(
    eventFeedbackInput.safeParse({ ...input, email: "person@example.com" })
      .success,
    false,
  );
});
test("fixed feedback IDs never advance while next weekly selection advances and excludes intensives", () => {
  const nov12 = event("ELZ-EVT-0004", "2026-11-12"),
    nov19 = event("ELZ-EVT-0005", "2026-11-19"),
    big = event("intensive", "2026-11-18", "intensive");
  const now = Date.parse("2026-11-16T12:00:00+08:00");
  assert.equal(feedbackPath(nov12.id), "/events/feedback/ELZ-EVT-0004");
  assert.equal(feedbackOpen(nov12, now), true);
  assert.equal(feedbackOpen(nov19, now), false);
  assert.equal(feedbackNext([nov12, big, nov19], now)?.id, nov19.id);
  assert.equal(feedbackNext([nov12, big], now), null);
});
test("write boundary has same-origin, validation, ended-event gate, private response and no public reader", () => {
  const src = readFileSync(
    new URL("../app/api/event-feedback/route.ts", import.meta.url),
    "utf8",
  );
  const http = readFileSync(
    new URL("../lib/event-feedback/http.ts", import.meta.url),
    "utf8",
  );
  const server = readFileSync(
    new URL("../lib/event-feedback/server.ts", import.meta.url),
    "utf8",
  );
  assert.match(http, /req.headers.get\("origin"\)/);
  assert.match(src, /verifiedFeedbackInput.safeParse/);
  assert.match(src, /openFeedbackEvent/);
  assert.match(server, /createHmac/);
  assert.match(server, /feedbackOpen/);
  assert.match(http, /private, no-store/);
  assert.ok(!src.includes("export async function GET"));
  const review = readFileSync(
    new URL("../components/events/EventFeedbackReview.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(
    review.indexOf("await dailyOwner()") <
      review.indexOf('.from("event_feedback")'),
  );
});
test("feedback schema denies direct browser access and serializes idempotent submissions with persistent limits", () => {
  const sql = readFileSync(
    new URL(
      "../supabase/migrations/20261116093000_event_feedback.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(sql, /enable row level security/);
  assert.match(
    sql,
    /revoke all on public.event_feedback from public,anon,authenticated/,
  );
  assert.match(sql, /security invoker/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /FEEDBACK_CONFLICT/);
  assert.match(sql, /FEEDBACK_RATE_LIMIT/);
});
test("database enforces private reads, repeat-safe writes, conflicts and persistent rate cap", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon;create role authenticated;create role service_role; create table public.events(id uuid primary key);insert into public.events values('00000000-0000-4000-8000-000000000001');",
    );
    await db.exec(
      readFileSync(
        new URL(
          "../supabase/migrations/20261116093000_event_feedback.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const id = "00000000-0000-4000-8000-000000000002",
      event = "00000000-0000-4000-8000-000000000001",
      hash = "a".repeat(64);
    const submit = (uuid: string, rating = 4) =>
      db.query("select public.submit_event_feedback($1,$2,$3,$4,$5)", [
        uuid,
        event,
        rating,
        "Synthetic QA",
        hash,
      ]);
    await submit(id);
    await submit(id);
    assert.equal(
      (
        await db.query<{ n: number }>(
          "select count(*)::int n from event_feedback",
        )
      ).rows[0].n,
      1,
    );
    await assert.rejects(submit(id, 1), /FEEDBACK_CONFLICT/);
    for (let n = 3; n <= 21; n++)
      await submit(`00000000-0000-4000-8000-${String(n).padStart(12, "0")}`);
    await assert.rejects(
      submit("00000000-0000-4000-8000-000000000022"),
      /FEEDBACK_RATE_LIMIT/,
    );
    await db.exec("set role anon");
    await assert.rejects(
      db.query("select * from event_feedback"),
      /permission denied/,
    );
    await assert.rejects(
      submit("00000000-0000-4000-8000-000000000023"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
