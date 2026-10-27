import assert from "node:assert/strict";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import {
  focusWeek,
  currentFocusWeek,
  personalFocusSchema,
} from "../lib/personal/model";
test("weekly choice rolls over at Singapore Monday midnight", () => {
  assert.equal(focusWeek(new Date("2026-11-01T15:59:59Z")).start, "2026-10-26");
  assert.equal(focusWeek(new Date("2026-11-01T16:00:00Z")).start, "2026-11-02");
  assert.equal(
    currentFocusWeek("2026-10-26", new Date("2026-11-01T16:00:00Z")),
    false,
  );
});
test("one explicit outcome validates bounds and rejects extra fields", () => {
  const v = {
    week_of: "2026-10-26",
    title: "  Audit subscriptions  ",
    area: 1,
    done: false,
    revision: 0,
  };
  assert.equal(personalFocusSchema.parse(v).title, "Audit subscriptions");
  for (const bad of [
    { ...v, title: " " },
    { ...v, area: 9 },
    { ...v, revision: -1 },
    { ...v, owner_id: "other" },
    { ...v, week_of: "2026-02-30" },
  ])
    assert.equal(personalFocusSchema.safeParse(bad).success, false);
});
test("private weekly storage preserves history and rejects stale revisions", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role; create table public.users(id uuid primary key); insert into public.users values ('11111111-1111-4111-8111-111111111111');",
    );
    await db.exec(
      readFileSync(
        "supabase/migrations/20261027144734_personal_weekly_focus.sql",
        "utf8",
      ),
    );
    await db.exec(
      "insert into personal_weekly_focus(owner_id,week_of,title,area) values('11111111-1111-4111-8111-111111111111','2026-10-26','Review subscriptions',1);",
    );
    const updated = await db.query(
      "update personal_weekly_focus set done=true,revision=2 where week_of='2026-10-26' and revision=1 returning revision",
    );
    assert.equal(updated.rows.length, 1);
    const stale = await db.query(
      "update personal_weekly_focus set done=false where week_of='2026-10-26' and revision=1 returning revision",
    );
    assert.equal(stale.rows.length, 0);
    await assert.rejects(
      db.exec(
        "insert into personal_weekly_focus(owner_id,week_of,title,area) values('11111111-1111-4111-8111-111111111111','2026-10-27','Bad week',1);",
      ),
    );
    const permissions = await db.query<{ allowed: boolean }>(
      "select has_table_privilege('authenticated','personal_weekly_focus','SELECT') as allowed",
    );
    assert.equal(permissions.rows[0].allowed, false);
    const policies = await db.query(
      "select * from pg_policies where tablename='personal_weekly_focus'",
    );
    assert.equal(policies.rows.length, 0);
  } finally {
    await db.close();
  }
});

test("write route refuses other users, hosts and cross-origin requests before database access", async () => {
  const vm = await import("node:vm");
  const ts = await import("typescript");
  const { isOwnerUser } = await import("../lib/admin-policy");
  const prior = process.env.WHATELZ_OWNER_USER_ID;
  const owner = "11111111-1111-4111-8111-111111111111";
  process.env.WHATELZ_OWNER_USER_ID = owner;
  try {
    for (const user of [
      null,
      { id: owner, role: "member" },
      { id: "22222222-2222-4222-8222-222222222222", role: "admin" },
      { id: owner, role: "admin" },
    ]) {
      let calls = 0;
      const mod = {
        exports: {} as { POST: (r: Request) => Promise<Response> },
      };
      const code = ts.transpileModule(
        readFileSync("app/api/admin/personal-focus/route.ts", "utf8"),
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
        require: (n: string) =>
          ({
            "@/lib/users": { ensureUserRow: async () => user },
            "@/lib/admin-policy": { isOwnerUser },
            "@/lib/personal/model": { personalFocusSchema, currentFocusWeek },
            "@/lib/supabase-server": {
              supabaseAdmin: {
                from() {
                  calls++;
                  throw Error("unexpected database access");
                },
              },
            },
          })[n],
        Response,
        Request,
        URL,
        TextEncoder,
        process: { env: { VERCEL_ENV: "production" } },
      });
      for (const [host, origin, body] of [
        ["app.whatelz.ai", "https://app.whatelz.ai", "{}"],
        ["admin.whatelz.ai", "https://evil.test", "{}"],
        ["admin.whatelz.ai", "https://admin.whatelz.ai", "{}"],
      ]) {
        const res = await mod.exports.POST(
          new Request("https://" + host + "/api/admin/personal-focus", {
            method: "POST",
            headers: { origin, "Content-Type": "application/json" },
            body,
          }),
        );
        assert.ok([400, 403].includes(res.status));
        assert.equal(calls, 0);
      }
    }
  } finally {
    if (prior === undefined) delete process.env.WHATELZ_OWNER_USER_ID;
    else process.env.WHATELZ_OWNER_USER_ID = prior;
  }
});
