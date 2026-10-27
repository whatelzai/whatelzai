import assert from "node:assert/strict";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createRequire } from "node:module";
import * as model from "../lib/money/model";
import { isOwnerUser } from "../lib/admin-policy";
const OWNER = "11111111-1111-4111-8111-111111111111";
const RULE = "22222222-2222-4222-8222-222222222222";
const ID = "33333333-3333-4333-8333-333333333333";
const entry = {
  id: ID,
  kind: "expense",
  occurred_on: "2026-10-27",
  amount_minor: 1234,
  currency: "MYR",
  jar: "NECC",
  account: "Cash",
  description: "Test lunch",
  category: "Food",
  scope: "personal",
  to_account: null,
  to_jar: null,
  to_currency: null,
  to_amount_minor: null,
};
test("exact cents reject rounding, zero, exponent and excessive precision", () => {
  assert.equal(model.minorUnits("0.29"), 29);
  assert.equal(model.minorUnits("1234.5"), 123450);
  for (const bad of ["1.001", "-1", "0", "1e3", "NaN", "10000000", "1,000"])
    assert.throws(() => model.minorUnits(bad));
});
test("transfer sides and real dates validated", () => {
  assert.equal(model.entrySchema.safeParse(entry).success, true);
  assert.equal(
    model.entrySchema.safeParse({ ...entry, occurred_on: "2026-02-30" })
      .success,
    false,
  );
  const transfer = {
    ...entry,
    kind: "transfer",
    to_account: "Wise",
    to_jar: "GIVE",
    to_currency: "MYR",
    to_amount_minor: 1233,
  };
  assert.equal(model.entrySchema.safeParse(transfer).success, false);
  assert.equal(
    model.entrySchema.safeParse({ ...transfer, to_currency: "SGD" }).success,
    true,
  );
  assert.equal(
    model.entrySchema.safeParse({ ...entry, amount_minor: 1.5 }).success,
    false,
  );
});
test("recurrence retains billing anchors through month end and leap years", () => {
  assert.equal(model.nextDue("2026-01-31", "monthly", 31, 1), "2026-02-28");
  assert.equal(model.nextDue("2026-02-28", "monthly", 31, 1), "2026-03-31");
  assert.equal(model.nextDue("2024-02-29", "yearly", 29, 2), "2025-02-28");
  assert.equal(model.nextDue("2027-02-28", "yearly", 29, 2), "2028-02-29");
  assert.equal(model.nextDue("2026-12-29", "weekly", 29, 12), "2027-01-05");
  assert.deepEqual(model.monthRange("2026-12"), {
    start: "2026-12-01",
    end: "2027-01-01",
  });
  assert.throws(() => model.monthRange("2026-13"));
  assert.equal(
    model.singaporeDay(new Date("2026-10-26T17:00:00Z")),
    "2026-10-27",
  );
});
test("CSV prevents formula injection and preserves quoted descriptions", () => {
  assert.equal(model.csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(model.csvCell("hello, world"), '"hello, world"');
});
const nodeRequire = createRequire(import.meta.url);
function route(user: unknown, env = "production") {
  let calls = 0;
  const code = ts.transpileModule(
    readFileSync(
      new URL("../app/api/admin/money/route.ts", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const mod = {
    exports: {} as Record<string, (r: Request) => Promise<Response>>,
  };
  const mocks: Record<string, unknown> = {
    "@/lib/users": { ensureUserRow: async () => user },
    "@/lib/admin-policy": { isOwnerUser },
    "@/lib/money/model": model,
    "@/lib/money/server": {
      moneyData: async () => {
        calls++;
        return { entries: [] };
      },
    },
    "@/lib/supabase-server": {
      supabaseAdmin: {
        from() {
          calls++;
          throw Error("Unexpected DB access");
        },
      },
    },
  };
  vm.runInNewContext(code, {
    module: mod,
    exports: mod.exports,
    require: (n: string) => (n in mocks ? mocks[n] : nodeRequire(n)),
    process: { env: { VERCEL_ENV: env } },
    Request,
    Response,
    URL,
    TextEncoder,
    console,
  });
  return { api: mod.exports, calls: () => calls };
}
// Owner policy uses the real env default; restore after testing.
test("actual routes reject foreign roles, public/member hosts, cross-origin and oversized payloads before data access", async () => {
  const previous = process.env.WHATELZ_OWNER_USER_ID;
  process.env.WHATELZ_OWNER_USER_ID = OWNER;
  try {
    for (const user of [
      null,
      { id: RULE, role: "admin" },
      { id: OWNER, role: "member" },
    ]) {
      const r = route(user);
      assert.equal(
        (
          await r.api.GET(
            new Request("https://admin.whatelz.ai/api/admin/money"),
          )
        ).status,
        403,
      );
      assert.equal(r.calls(), 0);
    }
    const r = route({ id: OWNER, role: "admin" });
    for (const host of ["app.whatelz.ai", "whatelz.ai", "fake.vercel.app"]) {
      assert.equal(
        (await r.api.GET(new Request(`https://${host}/api/admin/money`)))
          .status,
        403,
      );
    }
    for (const origin of ["https://app.whatelz.ai", "https://evil.test"]) {
      assert.equal(
        (
          await r.api.POST(
            new Request("https://admin.whatelz.ai/api/admin/money", {
              method: "POST",
              headers: { origin, "Content-Type": "application/json" },
              body: "{}",
            }),
          )
        ).status,
        403,
      );
    }
    assert.equal(
      (
        await r.api.POST(
          new Request("https://admin.whatelz.ai/api/admin/money", {
            method: "POST",
            headers: {
              origin: "https://admin.whatelz.ai",
              "Content-Type": "application/json",
            },
            body: "x".repeat(8193),
          }),
        )
      ).status,
      413,
    );
    assert.equal(
      (
        await r.api.GET(
          new Request("https://admin.whatelz.ai/api/admin/money?month=2026-13"),
        )
      ).status,
      400,
    );
    assert.equal(r.calls(), 0);
    assert.equal(
      (
        await r.api.GET(
          new Request("https://admin.whatelz.ai/api/admin/money?month=2026-10"),
        )
      ).status,
      200,
    );
  } finally {
    if (previous === undefined) delete process.env.WHATELZ_OWNER_USER_ID;
    else process.env.WHATELZ_OWNER_USER_ID = previous;
  }
});
test("real SQL ledger and bill recording: private grants, exact aggregation, atomic date advancement and retries", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role bypassrls; create table public.users(id uuid primary key); insert into public.users values ('" +
        OWNER +
        "');",
    );
    await db.exec(
      readFileSync(
        new URL(
          "../supabase/migrations/20261026185020_personal_money_ledger.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      `insert into public.personal_money_recurring(owner_id,id,name,amount_minor,currency,account,jar,category,scope,cadence,next_due,anchor_day,anchor_month,decision) values('${OWNER}','${RULE}','QA bill',999,'SGD','DBS','EDU','Software','personal','monthly','2026-01-31',31,1,'keep');`,
    );
    await db.query("select personal_money_record_bill($1,$2,$3,$4,$5,$6)", [
      OWNER,
      RULE,
      ID,
      "2026-01-31",
      "2026-01-31",
      1099,
    ]);
    await db.query("select personal_money_record_bill($1,$2,$3,$4,$5,$6)", [
      OWNER,
      RULE,
      ID,
      "2026-01-31",
      "2026-01-31",
      1099,
    ]);
    assert.equal(
      (
        await db.query<{ next_due: string }>(
          "select next_due::text from personal_money_recurring",
        )
      ).rows[0].next_due,
      "2026-02-28",
    );
    assert.equal(
      (
        await db.query<{ n: number }>(
          "select count(*)::int n from personal_money_entries",
        )
      ).rows[0].n,
      1,
    );
    await assert.rejects(
      db.query("select personal_money_record_bill($1,$2,$3,$4,$5,$6)", [
        OWNER,
        RULE,
        "44444444-4444-4444-8444-444444444444",
        "2026-01-31",
        "2026-01-31",
        1099,
      ]),
    );
    await db.exec(
      `insert into personal_money_entries(owner_id,id,kind,occurred_on,amount_minor,currency,jar,account,description,category,scope,to_account,to_jar,to_currency,to_amount_minor) values('${OWNER}','55555555-5555-4555-8555-555555555555','transfer','2026-01-20',10000,'SGD','UNALLOCATED','DBS','FX','General','personal','Wise','GIVE','MYR',33000);`,
    );
    const result = await db.query<{ s: model.MoneyData["summary"] }>(
      "select personal_money_summary($1,'2026-01-01','2026-02-01') s",
      [OWNER],
    );
    assert.equal(
      result.rows[0].s.activity.find((x) => x.kind === "expense")?.total,
      1099,
    );
    assert.equal(
      result.rows[0].s.balances.find((x) => x.currency === "MYR")?.total,
      33000,
    );
    await db.exec(
      `update personal_money_entries set voided=true where id='${ID}'`,
    );
    const after = await db.query<{ s: model.MoneyData["summary"] }>(
      "select personal_money_summary($1,'2026-01-01','2026-02-01') s",
      [OWNER],
    );
    assert.equal(
      after.rows[0].s.activity.some((x) => x.kind === "expense"),
      false,
    );
    await db.exec("set role authenticated");
    await assert.rejects(db.query("select * from personal_money_entries"));
    await assert.rejects(
      db.query("select personal_money_summary($1,'2026-01-01','2026-02-01')", [
        OWNER,
      ]),
    );
    await db.exec("reset role");
    const rls = await db.query<{ n: number }>(
      "select count(*)::int n from pg_class where relname in ('personal_money_entries','personal_money_recurring','personal_money_plan') and relrowsecurity",
    );
    assert.equal(rls.rows[0].n, 3);
  } finally {
    await db.close();
  }
});
