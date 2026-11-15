import test from "node:test";
import assert from "node:assert/strict";
import {
  eventView,
  filterAttendees,
  type Ticket,
  type Attempt,
} from "../lib/event-admin/model";
import { readFileSync } from "node:fs";
import ts from "typescript";
import vm from "node:vm";
const ticket = (id: string, over: Partial<Ticket> = {}): Ticket => ({
  id,
  signup_attempt_id: null,
  person_id: null,
  attendee_name: "Person " + id,
  email: id + "@example.test",
  phone: "+6500000000",
  status: "confirmed",
  email_sent_at: null,
  checked_in_at: null,
  created_at: "2026-11-10T00:00:00Z",
  stripe_payment_intent_id: null,
  ...over,
});
const attempt = (id: string, over: Partial<Attempt> = {}): Attempt => ({
  id,
  attendee_name: "Signup " + id,
  email: id + "@example.test",
  phone: "+6500000000",
  amount: 700,
  state: "checkout",
  created_at: "2026-11-10T00:00:00Z",
  payment_started_at: null,
  ...over,
});
test("confirmed attempt joins once; pending and released never count as payments or confirmed seats", () => {
  const d = eventView(
    [ticket("t", { signup_attempt_id: "a" })],
    [
      attempt("a", { state: "confirmed" }),
      attempt("b"),
      attempt("c", { state: "released" }),
    ],
    [],
    [],
  );
  assert.equal(d.rows.length, 3);
  assert.equal(d.counts.confirmed, 1);
  assert.equal(d.counts.pending, 1);
  assert.equal(d.counts.paid, 1);
  assert.equal(d.counts.recordedPaidMinor, 700);
});
test("legacy amounts stay unknown; free tickets and full refunds are not paid revenue", () => {
  const d = eventView(
    [
      ticket("legacy"),
      ticket("free", { signup_attempt_id: "f" }),
      ticket("refund", {
        signup_attempt_id: "r",
        stripe_payment_intent_id: "pi",
        status: "cancelled",
      }),
    ],
    [
      attempt("f", { amount: 0, state: "confirmed" }),
      attempt("r", { state: "confirmed" }),
    ],
    ["pi"],
    [],
  );
  assert.equal(d.counts.unknown, 1);
  assert.equal(d.counts.free, 1);
  assert.equal(d.counts.recordedPaidMinor, 0);
  assert.equal(
    d.rows.find((r) => r.id === "ticket:refund")?.payment,
    "refunded",
  );
});
test("linked users, sent emails and check-in use explicit evidence only", () => {
  const d = eventView(
    [
      ticket("a", {
        person_id: "p",
        email_sent_at: "now",
        checked_in_at: "now",
      }),
      ticket("b"),
    ],
    [],
    [],
    [{ id: "p", user_id: "u" }],
  );
  assert.equal(d.rows[0].accountLinked, true);
  assert.equal(d.rows[1].accountLinked, false);
  assert.equal(d.counts.checkedIn, 1);
  assert.equal(d.counts.emailPending, 1);
});
test("orphan confirmed attempt is flagged for review, not displayed as paid", () => {
  const d = eventView([], [attempt("orphan", { state: "confirmed" })], [], []);
  assert.equal(d.counts.confirmed, 0);
  assert.equal(d.counts.review, 1);
  assert.equal(d.counts.recordedPaidMinor, 0);
  assert.equal(filterAttendees(d.rows, "", "attention").length, 1);
});
test("search and filters match name/contact without merging different registrations", () => {
  const d = eventView(
    [ticket("a"), ticket("b", { checked_in_at: "now", status: "cancelled" })],
    [attempt("p")],
    [],
    [],
  );
  assert.equal(filterAttendees(d.rows, " A@EXAMPLE.TEST ", "all").length, 1);
  assert.equal(filterAttendees(d.rows, "", "pending").length, 1);
  assert.equal(filterAttendees(d.rows, "", "checked-in").length, 0);
  assert.equal(filterAttendees(d.rows, "", "cancelled").length, 1);
});
test("API rejects non-Admin hosts before accessing private data and never caches payloads", async () => {
  let reads = 0;
  const mod = { exports: {} as { GET: (r: Request) => Promise<Response> } };
  const code = ts.transpileModule(
    readFileSync(
      new URL("../app/api/admin/event-registrations/route.ts", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    module: mod,
    exports: mod.exports,
    require: () => ({
      eventAdminData: async () => {
        reads++;
        return { rows: [] };
      },
    }),
    process: { env: { NODE_ENV: "production" } },
    URL,
    Response,
  });
  for (const host of ["whatelz.ai", "app.whatelz.ai", "localhost"]) {
    assert.equal(
      (
        await mod.exports.GET(
          new Request(`https://${host}/api/admin/event-registrations`),
        )
      ).status,
      403,
    );
  }
  assert.equal(reads, 0);
  const response = await mod.exports.GET(
    new Request("https://admin.whatelz.ai/api/admin/event-registrations"),
  );
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(reads, 1);
});
test("server guard runs before any database access and errors never become zero counts", async () => {
  let reads = 0;
  const mod = { exports: {} as { eventAdminData: () => Promise<unknown> } };
  const code = ts.transpileModule(
    readFileSync(
      new URL("../lib/event-admin/server.ts", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    module: mod,
    exports: mod.exports,
    require: (name: string) =>
      ({
        "server-only": {},
        "@/lib/daily/server": {
          dailyOwner: async () => {
            throw Error("Forbidden");
          },
        },
        "@/lib/supabase-server": {
          supabaseAdmin: {
            from: () => {
              reads++;
              throw Error("unexpected");
            },
          },
        },
        "@/lib/public-events/map": { currentEvent: { key: "event" } },
        "./model": { eventView },
      })[name],
  });
  await assert.rejects(() => mod.exports.eventAdminData(), /Forbidden/);
  assert.equal(reads, 0);
});

test("default attendee filter hides failed/released and cancelled records without losing audit access", () => {
  const d = eventView(
    [ticket("active"), ticket("cancelled", { status: "cancelled" })],
    [attempt("pending"), attempt("failed", { state: "released" })],
    [],
    [],
  );
  const active = filterAttendees(d.rows, "", "active");
  assert.equal(active.length, 2);
  assert.ok(active.every((r) => !["released", "cancelled"].includes(r.status)));
  assert.equal(filterAttendees(d.rows, "", "all").length, 4);
  assert.equal(filterAttendees(d.rows, "", "cancelled").length, 2);
});
