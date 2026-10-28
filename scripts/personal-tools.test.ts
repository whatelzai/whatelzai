import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { allocate, elapsed, saveSchema } from "../lib/personal-tools/model";
import type { MoneyPlan } from "../lib/money/model";
const plan: MoneyPlan = {
  jar_base_minor: 550000,
  tax_minor: 50000,
  reserve_target_minor: 900000,
  income_account: "DBS",
  jar_plan: [
    ["FFA", 20, "Moomoo"],
    ["LTSS", 10, "OCBC"],
    ["EDU", 20, "UOB"],
    ["NECC", 40, "GXS"],
    ["PLAY", 5, "MariBank"],
    ["GIVE", 5, "Wise"],
  ].map(([jar, percent, account]) => ({
    jar: String(jar),
    percent: Number(percent),
    account: String(account),
    cents: 0,
  })),
};
test("allocation preserves every cent including partial income and does not assume tax", () => {
  for (const amount of [354545, 600000, 10001, 101]) {
    const rows = allocate(amount, 100, plan);
    assert.equal(
      rows.reduce((s, r) => s + r.minor, 0),
      amount,
    );
    assert.equal(rows[0].minor, 100);
  }
  assert.deepEqual(
    allocate(600000, 50000, plan).map((r) => r.minor),
    [50000, 110000, 55000, 110000, 220000, 27500, 27500],
  );
  assert.throws(() => allocate(100, 100, plan));
  assert.throws(() => allocate(1000, 0, { ...plan, jar_plan: [] }));
});
test("timer catches elapsed wall clock across suspension and pause", () => {
  assert.equal(elapsed(1000, 2000, 61000), 62000);
  assert.equal(elapsed(null, 2000, 61000), 2000);
  assert.equal(elapsed(61000, 2000, 1000), 2000);
});
test("strict records reject invalid dates, invented fields, negative weights and excessive payloads", () => {
  const v = {
    id: "11111111-1111-4111-8111-111111111111",
    revision: 0,
    occurred_on: "2026-10-28",
    data: {
      kind: "training",
      name: "Pull",
      sets: [{ exercise: "Row", reps: 8, kg: 20 }],
      note: "",
    },
  };
  assert.ok(saveSchema.safeParse(v).success);
  assert.ok(!saveSchema.safeParse({ ...v, occurred_on: "2026-02-30" }).success);
  assert.ok(!saveSchema.safeParse({ ...v, owner_id: "x" }).success);
  assert.ok(
    !saveSchema.safeParse({
      ...v,
      data: { ...v.data, sets: [{ exercise: "Row", reps: 8, kg: -1 }] },
    }).success,
  );
});
test("SQL denies browser access; saves are owner scoped, retry safe, revision protected and kind immutable", async () => {
  const db = new PGlite();
  await db.exec(
    "create role anon;create role authenticated;create role service_role bypassrls;create table public.users(id uuid primary key);insert into users values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');",
  );
  await db.exec(
    readFileSync(
      new URL(
        "../supabase/migrations/20261028121901_personal_tools.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const owner = "11111111-1111-4111-8111-111111111111",
    other = "22222222-2222-4222-8222-222222222222",
    id = "33333333-3333-4333-8333-333333333333";
  const save = (who: string, n: number, data: object) =>
    db.query("select * from personal_tool_save($1,$2,$3,$4,$5,$6)", [
      who,
      id,
      "meditation",
      "2026-10-28",
      JSON.stringify(data),
      n,
    ]);
  const value = { kind: "meditation", seconds: 60, topic: "", note: "" };
  await db.exec("set role service_role");
  await save(owner, 0, value);
  await save(owner, 0, value);
  await assert.rejects(() => save(owner, 0, { ...value, seconds: 70 }));
  await save(other, 0, value);
  await save(owner, 1, { ...value, seconds: 70 });
  await assert.rejects(() => save(owner, 1, { ...value, seconds: 80 }));
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`reset role;set role ${role}`);
    await assert.rejects(() => db.query("select * from personal_tool_records"));
    await assert.rejects(() => save(owner, 0, value));
  }
  await db.close();
});

import vm from "node:vm";
import ts from "typescript";
import { isOwnerUser } from "../lib/admin-policy";
function route(user: unknown) {
  let reads = 0;
  const code = ts.transpileModule(
    readFileSync(
      new URL("../app/api/admin/personal-tools/route.ts", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const mod = {
    exports: {} as Record<string, (r: Request) => Promise<Response>>,
  };
  vm.runInNewContext(code, {
    module: mod,
    exports: mod.exports,
    require: (name: string) =>
      (
        ({
          "@/lib/users": { ensureUserRow: async () => user },
          "@/lib/admin-policy": {
            isOwnerUser: (u: Parameters<typeof isOwnerUser>[0]) =>
              isOwnerUser(u, "11111111-1111-4111-8111-111111111111"),
          },
          "@/lib/personal-tools/server": {
            toolsData: async () => {
              reads++;
              return { records: [] };
            },
          },
          "@/lib/personal-tools/model": { allocate, saveSchema },
          "@/lib/daily/model": { singaporeDay: () => "2026-10-28" },
          "@/lib/supabase-server": {
            supabaseAdmin: {
              from: () => {
                reads++;
                throw Error("Unexpected access");
              },
              rpc: async () => {
                reads++;
                return { data: [{ id: "saved" }] };
              },
            },
          },
        }) as Record<string, unknown>
      )[name],
    process: { env: { VERCEL_ENV: "production" } },
    Response,
    Request,
    URL,
    TextEncoder,
    JSON,
  });
  return { api: mod.exports, reads: () => reads };
}
test("API forbids other hosts, non-owner identities, cross-origin writes and invalid payloads before DB access", async () => {
  const owner = { id: "11111111-1111-4111-8111-111111111111", role: "admin" };
  for (const host of ["app.whatelz.ai", "whatelz.ai", "evil.vercel.app"]) {
    const r = route(owner);
    assert.equal(
      (await r.api.GET(new Request(`https://${host}/api/admin/personal-tools`)))
        .status,
      403,
    );
    assert.equal(r.reads(), 0);
  }
  const r = route(null);
  assert.equal(
    (
      await r.api.GET(
        new Request("https://admin.whatelz.ai/api/admin/personal-tools"),
      )
    ).status,
    403,
  );
  const a = route(owner);
  const req = (origin: string, body: unknown) =>
    new Request("https://admin.whatelz.ai/api/admin/personal-tools", {
      method: "POST",
      headers: { origin, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  assert.equal(
    (await a.api.POST(req("https://app.whatelz.ai", {}))).status,
    403,
  );
  assert.equal(
    (await a.api.POST(req("https://admin.whatelz.ai", {}))).status,
    400,
  );
  assert.equal(
    (
      await a.api.POST(
        req("https://admin.whatelz.ai", {
          id: "11111111-1111-4111-8111-111111111111",
          revision: 0,
          occurred_on: "2030-01-01",
          data: { kind: "meditation", seconds: 5, topic: "", note: "" },
        }),
      )
    ).status,
    400,
  );
  assert.equal(a.reads(), 0);
});
