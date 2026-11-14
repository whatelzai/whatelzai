import assert from "node:assert/strict";
import { test } from "node:test";
import {
  portfolioEvents,
  nextPortfolioEvent,
  peopleStatistics,
  type PortfolioEvent,
} from "../lib/event-portfolio";
import type { InviteContact } from "../lib/ai-invites/model";
const event = (
  id: string,
  date: string | null,
  metadata: Record<string, unknown> = {},
): PortfolioEvent => ({
  id,
  name: id,
  date,
  location: null,
  published: false,
  metadata,
});
const legacy = { ...event("legacy", "2026-11-12"), key: "nov12" };
test("nearest upcoming event leads; past, cancelled and completed-today events cannot steal focus", () => {
  const e = [
    legacy,
    event("nov19", "2026-11-19"),
    event("cancelled", "2026-11-15", { status: "cancelled" }),
    event("today-ended", "2026-11-14", {
      ends_at: "2026-11-14T08:00:00+08:00",
    }),
    event("next-month", "2026-12-01"),
  ];
  assert.equal(
    nextPortfolioEvent(e, "2026-11-14", Date.parse("2026-11-14T09:00:00+08:00"))
      ?.id,
    "nov19",
  );
  assert.equal(nextPortfolioEvent(e, "2026-11-20")?.id, "next-month");
  assert.equal(nextPortfolioEvent(e, "2027-01-01"), null);
});
test("stored legacy-key match deduplicates catalogue without mutating source or merging names/dates", () => {
  const twin = event("stored", "2026-11-12", { event_key: "nov12" });
  const sameNameDate = { ...twin, id: "different", metadata: {} };
  const rows = portfolioEvents(
    [
      twin,
      sameNameDate,
      event("wrong-date", "2026-06-28", { superseded_by: "june28" }),
    ],
    legacy,
  );
  assert.equal(rows.length, 2);
  assert.equal(rows.find((e) => e.id === "stored")?.key, "nov12");
  assert.equal(twin.key, undefined);
  assert.equal(portfolioEvents([], legacy).length, 1);
});
const visit = (ref: string) => ({
  ref,
  title: ref,
  date: "2026-11-12",
  source: "ticket" as const,
});
const person = (
  id: string,
  refs: string[],
  extra: Partial<InviteContact> = {},
) =>
  ({
    id,
    name: "Same name",
    status: "active",
    follow_up_on: null,
    attendance: refs.map(visit),
    ...extra,
  }) as InviteContact;
test("people are distinct by explicit contact ID; visits deduplicate event references, not names", () => {
  const s = peopleStatistics(
    [
      person("a", ["june", "nov", "nov"]),
      person("b", ["nov"]),
      person("c", [], { follow_up_on: "2026-11-13" }),
      person("d", ["june"], {
        status: "do_not_contact",
        follow_up_on: "2026-11-13",
      }),
    ],
    "2026-11-14",
  );
  assert.equal(s.contacts, 4);
  assert.equal(s.distinct, 3);
  assert.equal(s.visits, 4);
  assert.equal(s.returning.length, 1);
  assert.equal(s.events.find((e) => e.ref === "nov")?.attendees, 2);
  assert.equal(s.due.length, 1);
  assert.equal(s.due[0].id, "c");
});
test("empty recorded data stays zero and unknown future follow-ups do not become due", () => {
  const s = peopleStatistics(
    [person("a", [], { follow_up_on: "2026-12-01" })],
    "2026-11-14",
  );
  assert.equal(s.distinct, 0);
  assert.equal(s.visits, 0);
  assert.equal(s.due.length, 0);
  assert.deepEqual(s.events, []);
});

// Exercise the server read boundary: selecting an archive must scope both tickets
// and signup attempts to that event, and owner rejection must happen before I/O.
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
test("archive reads scope both payment sources and reject non-owners before I/O", async () => {
  const filters: string[] = [];
  let owner = true;
  const db = {
    from: () => {
      const q = {
        select: () => q,
        eq: (_column: string, value: string) => {
          filters.push(value);
          return q;
        },
        order: () => q,
        range: async () => ({ data: [], error: null, count: 0 }),
      };
      return q;
    },
  };
  const exports: Record<string, (key?: string) => Promise<unknown>> = {};
  const js = ts.transpileModule(
    fs.readFileSync("lib/event-admin/server.ts", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.runInNewContext(js, {
    exports,
    require: (name: string) => {
      if (name === "server-only") return {};
      if (name === "@/lib/supabase-server") return { supabaseAdmin: db };
      if (name === "@/lib/daily/server")
        return {
          dailyOwner: async () => {
            if (!owner) throw Error("owner required");
          },
        };
      if (name === "@/lib/public-events/map")
        return { currentEvent: { key: "default-event" } };
      if (name === "./model") return { eventView: () => ({ counts: {} }) };
      throw Error(name);
    },
  });
  await exports.eventAdminData("archived-event");
  assert.deepEqual(filters, ["archived-event", "archived-event"]);
  filters.length = 0;
  await exports.eventAdminData();
  assert.deepEqual(filters, ["default-event", "default-event"]);
  filters.length = 0;
  owner = false;
  await assert.rejects(
    exports.eventAdminData("archived-event"),
    /owner required/,
  );
  assert.equal(filters.length, 0);
});
