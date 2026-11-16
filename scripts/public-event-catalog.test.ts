import assert from "node:assert/strict";
import test from "node:test";
import {
  projectEvent,
  pastEvents,
  nextWeeklyEvent,
  resolveEvent,
  safeEventPath,
  safePoster,
  type CatalogRow,
} from "../lib/public-events/catalog";
import {
  platformCheckoutParams,
  platformSessionMatches,
  eventRegistrationSchema,
} from "../lib/event-registration-policy";
import { registrationCookie } from "../lib/public-events/map";
const now = Date.parse("2026-11-16T12:00:00+08:00");
function row(
  id: string,
  date: string,
  metadata: Record<string, unknown> = {},
): CatalogRow {
  return {
    id,
    type: "training",
    slug: id,
    name: "Session " + id,
    date,
    location: "The Vibe",
    published: true,
    metadata: {
      event_id: id,
      event_format: "weekly",
      currency: "SGD",
      price_minor: 800,
      ...metadata,
    },
  };
}
function event(
  id: string,
  date: string,
  metadata: Record<string, unknown> = {},
) {
  return projectEvent(row(id, date, metadata))!;
}
test("history follows actual ending time in Singapore, never a fixed poster count", () => {
  const events = [
    event("june", "2026-06-28"),
    event("nov12", "2026-11-12"),
    event("nov19", "2026-11-19", { ends_at: "2026-11-19T21:30:00+08:00" }),
  ];
  assert.deepEqual(
    pastEvents(events, now).map((e) => e.id),
    ["nov12", "june"],
  );
  assert.deepEqual(
    pastEvents(events, Date.parse("2026-11-19T21:30:00+08:00")).map(
      (e) => e.id,
    ),
    ["nov19", "nov12", "june"],
  );
  assert.equal(pastEvents([event("date-only", "2026-11-16")], now).length, 0);
});
test("evergreen next selects earliest published weekly event and excludes intensive, sharing and unlisted events", () => {
  const events = [
    event("ami", "2026-11-17", { event_format: "intensive" }),
    event("sharing", "2026-11-17", { event_format: "sharing" }),
    event("unlisted", "2026-11-17", { public_visibility: "unlisted" }),
    event("later", "2026-11-26", { topic: "money" }),
    event("next", "2026-11-19", { topic: "ai" }),
    event("old", "2026-11-12"),
  ];
  assert.equal(nextWeeklyEvent(events, now)?.id, "next");
  assert.equal(nextWeeklyEvent(events, Date.parse("2026-11-20"))?.id, "later");
  assert.equal(nextWeeklyEvent(events, Date.parse("2027-01-01")), null);
  for (const metadata of [
    { status: "cancelled" },
    { status: "draft" },
    { superseded_by: "other" },
  ])
    assert.equal(projectEvent(row("bad", "2026-11-19", metadata)), null);
  assert.equal(
    projectEvent({ ...row("private", "2026-11-19"), published: false }),
    null,
  );
});
test("public projection cannot leak private notes, contacts, media paths or completion capabilities", () => {
  const e = projectEvent({
    ...row("public", "2026-11-19", {
      poster_files: { post: { path: "private/secret.png" } },
      private_notes: "PRIVATE_NOTE",
      token: "SECRET_TOKEN",
      stripe_price_id: "price_PrivateConfig",
      public_content: {
        heading: "About",
        paragraphs: ["Approved public paragraph"],
      },
      description: "Public description",
      contact_email: "PRIVATE_EMAIL",
    }),
    notes: "PRIVATE_OWNER_NOTES",
  } as CatalogRow)!;
  const payload = JSON.stringify(e);
  for (const value of [
    "PRIVATE_NOTE",
    "PRIVATE_EMAIL",
    "SECRET_TOKEN",
    "price_PrivateConfig",
    "private/secret",
    "PRIVATE_OWNER_NOTES",
  ])
    assert.ok(!payload.includes(value));
  assert.ok(payload.includes("Approved public paragraph"));
  assert.equal(e.poster, null);
});
test("canonical aliases remain stable, date ambiguity fails closed and redirect paths stay local", () => {
  const a = event("a", "2026-11-19", { public_path: "/events/fixed-a" }),
    b = event("b", "2026-11-19");
  assert.equal(resolveEvent([a, b], "2026-11-19"), null);
  assert.equal(resolveEvent([a, b], "a")?.path, "/events/a");
  assert.equal(resolveEvent([a, b], "fixed-a")?.id, "a");
  for (const path of [
    "https://evil.example/x",
    "//evil.example",
    "/events/next",
    "/events/register",
    "/events/../admin",
    "/events/x?redirect=evil",
  ])
    assert.equal(safeEventPath(path), null);
  for (const path of [
    "/api/admin/event-poster?event=private",
    "https://example.com/photo.png",
    "/images/events/../private.png",
  ])
    assert.equal(safePoster(path), null);
});
test("separate AI and money weekly topics use the approved S$8 default while intensive price stays unknown", () => {
  for (const topic of ["ai", "money"])
    assert.equal(
      projectEvent(
        row(topic, "2026-11-26", {
          topic,
          currency: undefined,
          price_minor: undefined,
        }),
      )?.priceMinor,
      800,
    );
  assert.equal(
    projectEvent(
      row("intensive", "2026-12-01", {
        event_format: "intensive",
        currency: undefined,
        price_minor: undefined,
      }),
    )?.priceMinor,
    null,
  );
});
test("future configured weekly signup uses its own price, marker, cookie and exact fulfillment amount", () => {
  const config = {
    eventId: "ELZ-EVT-0006",
    eventKey: "future-ai-session",
    amount: 800,
    priceId: "price_futureConfigured",
  };
  const params = platformCheckoutParams(
    {
      id: "00000000-0000-4000-8000-000000000001",
      email: "a@example.test",
      created_at: "2026-11-16T00:00:00Z",
      event_key: config.eventKey,
    },
    "https://whatelz.ai",
    config,
  );
  assert.equal(params.metadata?.whatelz_event_id, config.eventId);
  assert.equal(params.line_items?.[0].price, config.priceId);
  assert.match(params.success_url!, /event=ELZ-EVT-0006/);
  assert.notEqual(
    registrationCookie({ id: config.eventId }),
    registrationCookie({ id: "ELZ-EVT-0005" }),
  );
  assert.ok(
    eventRegistrationSchema.safeParse({
      eventId: config.eventId,
      name: "A",
      phone: "+60123456789",
      email: "a@example.test",
      requestToken: "00000000-0000-4000-8000-000000000001",
    }).success,
  );
  const session = {
    mode: "payment",
    status: "complete",
    payment_status: "paid",
    currency: "sgd",
    amount_total: 800,
    amount_subtotal: 800,
    metadata: { whatelz_event_id: config.eventId },
    client_reference_id: "00000000-0000-4000-8000-000000000001",
  };
  assert.equal(platformSessionMatches(session, config), true);
  assert.equal(
    platformSessionMatches({ ...session, amount_total: 700 }, config),
    false,
  );
  assert.equal(
    platformSessionMatches(
      { ...session, metadata: { whatelz_event_id: "ELZ-EVT-0005" } },
      config,
    ),
    false,
  );
});

test("event ID URLs stay fixed when title, date or legacy path changes, retaining old aliases", () => {
  const original = event("ELZ-EVT-0004", "2026-11-12", {
    public_path: "/events/money-mindset-ai-skillset",
  });
  const next = event("ELZ-EVT-0005", "2026-11-19", {
    public_path: "/events/2026-11-19",
  });
  assert.equal(original.path, "/events/ELZ-EVT-0004");
  assert.equal(next.path, "/events/ELZ-EVT-0005");
  assert.equal(
    resolveEvent([original, next], "money-mindset-ai-skillset")?.id,
    original.id,
  );
  assert.equal(resolveEvent([original, next], "2026-11-19")?.id, next.id);
  const moved = projectEvent({
    ...row("ELZ-EVT-0005", "2026-11-26"),
    name: "AI Skillset",
  })!;
  assert.equal(moved.path, next.path);
  assert.equal(nextWeeklyEvent([original, next], now)?.path, next.path);
  assert.equal(
    resolveEvent([original, next], "ELZ-EVT-0004")?.path,
    original.path,
  );
});
