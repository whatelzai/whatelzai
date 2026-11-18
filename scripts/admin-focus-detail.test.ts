import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { administrativeFocus } from "../lib/admin-focus/model";
function harness(allowed = true) {
  const calls: unknown[][] = [];
  const query = {
    select: (s: string) => {
      calls.push(["select", s]);
      return query;
    },
    eq: (k: string, v: string) => {
      calls.push(["eq", k, v]);
      return query;
    },
    maybeSingle: async () => ({
      data: {
        title: "Owner task",
        lane: "day-job",
        due_on: "2026-11-18",
        status: "done",
        accepted_on: "2026-11-18",
      },
      error: null,
    }),
  };
  const modules: Record<string, unknown> = {
    "server-only": {},
    "@/lib/daily/server": {
      dailyOwner: async () => {
        if (!allowed) throw Error("Owner only");
        return "verified-owner";
      },
    },
    "@/lib/supabase-server": {
      supabaseAdmin: {
        from: (t: string) => {
          calls.push(["from", t]);
          return query;
        },
      },
    },
    "@/lib/admin-calendar/server": {
      loadAdminCalendar: async () => ({ events: [], unavailable: [] }),
    },
    "./model": { administrativeFocus },
  };
  const mod = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(
        new URL("../lib/admin-focus/server.ts", import.meta.url),
        "utf8",
      ),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
    { module: mod, exports: mod.exports, require: (n: string) => modules[n] },
  );
  return {
    calls,
    load: (
      mod.exports as {
        loadFocusDetail: (
          id: string,
        ) => Promise<{ title: string; status: string } | null>;
      }
    ).loadFocusDetail,
  };
}
test("focus detail verifies owner before any storage and reads exact task by owner plus stable UUID", async () => {
  const denied = harness(false);
  await assert.rejects(() =>
    denied.load("task:4cc06eb6-4b59-4e67-82bc-6f04df256490"),
  );
  assert.equal(denied.calls.length, 0);
  const h = harness();
  const item = await h.load("task:4cc06eb6-4b59-4e67-82bc-6f04df256490");
  assert.equal(item?.status, "done");
  assert.ok(
    h.calls.some(
      (c) => c[0] === "eq" && c[1] === "owner_id" && c[2] === "verified-owner",
    ),
  );
  assert.ok(
    h.calls.some(
      (c) =>
        c[0] === "eq" &&
        c[1] === "id" &&
        c[2] === "4cc06eb6-4b59-4e67-82bc-6f04df256490",
    ),
  );
});
test("invalid references do not query storage and dated routine links must match their actual weekday", async () => {
  const h = harness();
  assert.equal(await h.load("task:not-a-uuid"), null);
  assert.equal(await h.load("routine:planning:2026-11-18"), null);
  assert.equal(h.calls.length, 0);
  assert.equal(
    (await h.load("routine:planning:2026-11-19"))?.title,
    "Plan next week · Sprint-002",
  );
});
