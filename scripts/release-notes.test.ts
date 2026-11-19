import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as model from "../lib/releases/model";
function load<T>(file: string, mocks: Record<string, unknown>) {
  const code = ts.transpileModule(
    readFileSync(new URL(`../${file}`, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const target = { exports: {} };
  vm.runInNewContext(code, {
    module: target,
    exports: target.exports,
    Date,
    Number,
    Error,
    Promise,
    require: (name: string) => {
      if (name === "server-only") return {};
      if (name in mocks) return mocks[name];
      throw Error(`Unexpected dependency ${name}`);
    },
  });
  return target.exports as T;
}
const older = { id: 4, published_at: "2026-10-26T00:00:00.000Z" },
  newer = { id: 2, published_at: "2026-10-27T00:00:00.000Z" };
test("release ordering and cursors follow publication, not creation order", () => {
  assert.ok(model.hasNewRelease(newer, older));
  assert.ok(model.hasNewRelease(newer, null));
  assert.equal(model.hasNewRelease(newer, newer), false);
  assert.ok(model.hasNewRelease({ ...newer, id: 3 }, newer));
  assert.deepEqual(model.releaseCursor(model.releasePosition(newer)), newer);
  for (const v of [
    undefined,
    "",
    "1",
    "bad~1",
    "2026-10-27T00:00:00.000Z~0",
    "2026-10-27T00:00:00.000Z~2),published.eq.false",
    "2026-99-99T00:00:00.000Z~2",
  ])
    assert.equal(model.releaseCursor(v), null);
});
test("loaders scope receipts to the verified viewer and return bounded published content", async () => {
  let assigned = true;
  let viewer = "account-a";
  let dbCalls = 0;
  let seen: number | null = null;
  const calls: { table: string; op: string; args: unknown[] }[] = [];
  const db = {
    from(table: string) {
      dbCalls++;
      const query = {
        select: (...args: unknown[]) => {
          calls.push({ table, op: "select", args });
          return query;
        },
        eq: (...args: unknown[]) => {
          calls.push({ table, op: "eq", args });
          return query;
        },
        lte: (...args: unknown[]) => {
          calls.push({ table, op: "lte", args });
          return query;
        },
        order: (...args: unknown[]) => {
          calls.push({ table, op: "order", args });
          return query;
        },
        or: (...args: unknown[]) => {
          calls.push({ table, op: "or", args });
          return query;
        },
        limit: (...args: unknown[]) => {
          calls.push({ table, op: "limit", args });
          return query;
        },
        maybeSingle: async () => ({
          data:
            seen === null
              ? null
              : { release_id: seen, seen_published_at: newer.published_at },
          error: null,
        }),
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve({
            data: [{ ...newer, slug: "new", title: "New", body: "Update" }],
            error: null,
          }).then(resolve),
      };
      return query;
    },
  };
  const api = load<{
    loadHomeReleaseNotes: () => Promise<{
      show: boolean;
      releases: model.ReleaseNote[];
    }>;
    loadReleaseArchive: (cursor?: string) => Promise<unknown>;
  }>("lib/releases/server.ts", {
    "@/lib/app-access": {
      requireAssignedUser: async () => {
        if (!assigned) throw Error("unassigned");
        return { id: viewer };
      },
    },
    "@/lib/supabase-server": { supabaseAdmin: db },
    "./model": model,
  });
  assert.equal((await api.loadHomeReleaseNotes()).show, true);
  assert.ok(
    calls.some(
      (c) =>
        c.table === "member_release_receipts" &&
        c.op === "eq" &&
        c.args[0] === "user_id" &&
        c.args[1] === viewer,
    ),
  );
  assert.ok(calls.some((c) => c.op === "limit" && c.args[0] === 3));
  assert.ok(
    calls.some(
      (c) => c.op === "eq" && c.args[0] === "published" && c.args[1] === true,
    ),
  );
  assert.ok(calls.some((c) => c.op === "lte" && c.args[0] === "published_at"));
  seen = 2;
  assert.equal((await api.loadHomeReleaseNotes()).show, false);
  viewer = "account-b";
  seen = null;
  assert.equal((await api.loadHomeReleaseNotes()).show, true);
  await api.loadReleaseArchive(model.releasePosition(newer));
  assert.ok(calls.some((c) => c.op === "limit" && c.args[0] === 21));
  assert.ok(
    calls.some(
      (c) =>
        c.op === "or" &&
        String(c.args[0]).includes("published_at.lt.2026-10-27"),
    ),
  );
  assigned = false;
  const before = dbCalls;
  await assert.rejects(api.loadHomeReleaseNotes(), /unassigned/);
  await assert.rejects(api.loadReleaseArchive(), /unassigned/);
  assert.equal(dbCalls, before);
});
test("dismissal derives account on the server and validates the release identifier", async () => {
  const writes: unknown[] = [];
  let assigned = true;
  const api = load<{
    dismissRelease: (id: number) => Promise<{ saved: boolean }>;
  }>("app/member-home/release-actions.ts", {
    "next/cache": { revalidatePath: () => undefined },
    "@/lib/app-access": {
      requireAssignedUser: async () => {
        if (!assigned) throw Error("unassigned");
        return { id: "account-a" };
      },
    },
    "@/lib/supabase-server": {
      supabaseAdmin: {
        rpc: async (name: string, args: unknown) => {
          writes.push({ name, args });
          return { error: null };
        },
      },
    },
  });
  for (const id of [-1, 0, 1.5, NaN, Infinity])
    assert.equal((await api.dismissRelease(id)).saved, false);
  assert.equal(writes.length, 0);
  assert.equal((await api.dismissRelease(2)).saved, true);
  assert.equal(
    JSON.stringify(writes),
    JSON.stringify([
      {
        name: "acknowledge_member_release",
        args: { p_user: "account-a", p_release: 2 },
      },
    ]),
  );
  assigned = false;
  await assert.rejects(api.dismissRelease(2), /unassigned/);
  assert.equal(writes.length, 1);
});
