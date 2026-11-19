import { briefPreview } from "../lib/admin-overview/preview";
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import {
  aiBusinessFocus,
  briefStatus,
  productSignal,
} from "../lib/admin-overview/model";
import type { Task } from "../lib/daily/model";
import type { OwnerMetrics } from "../lib/cockpit";
import * as dailyModel from "../lib/daily/model";
import * as overviewModel from "../lib/admin-overview/model";
const nodeRequire = createRequire(import.meta.url);
function load<T>(
  file: string,
  mocks: Record<string, unknown>,
  extra: Record<string, unknown> = {},
) {
  const code = ts.transpileModule(
    readFileSync(new URL(`../${file}`, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const testModule = { exports: {} };
  vm.runInNewContext(code, {
    module: testModule,
    exports: testModule.exports,
    require: (name: string) =>
      name === "server-only"
        ? {}
        : name in mocks
          ? mocks[name]
          : nodeRequire(name),
    process: {
      env: {
        EMDEE_ORIGIN: "https://example.invalid",
        EMDEE_OWNER_METRICS_TOKEN: "fake-fixture",
      },
    },
    URL,
    Response,
    AbortController,
    setTimeout,
    clearTimeout,
    ...extra,
  });
  return testModule.exports as T;
}
const day = "2026-10-22";
const now = new Date("2026-10-21T22:00:00Z");
const task = (id: string, changes: Partial<Task> = {}): Task => ({
  id,
  title: id,
  lane: "ai-business",
  due_on: day,
  status: "open",
  revision: 0,
  accepted_on: day,
  completed_at: null,
  ...changes,
});
test("focus uses only accepted open AI-business commitments and preserves unresolved states", () => {
  const result = aiBusinessFocus(
    [
      task("today"),
      task("overdue", { due_on: "2026-10-21" }),
      task("proposal", { status: "proposed", accepted_on: null }),
      task("unaccepted", { accepted_on: null }),
      task("other-lane", { lane: "network-marketing" }),
      task("deferred", { status: "deferred" }),
      task("blocked", { status: "blocked" }),
      task("waiting", { status: "waiting" }),
      task("future", { due_on: "2026-10-23" }),
    ],
    [
      task("done", { status: "done" }),
      task("unknown", { status: "open" }),
      task("other-done", { status: "done", lane: "day-job" }),
    ],
    day,
  );
  assert.deepEqual(
    result.focus.map((t) => t.id),
    ["overdue", "today"],
  );
  assert.equal(result.due, 4);
  assert.equal(result.overdue, 1);
  assert.equal(result.blocked, 1);
  assert.equal(result.waiting, 1);
  assert.equal(result.completed, 1);
  assert.equal(result.proposals, 1);
  assert.equal(result.upcoming[0].id, "future");
});
test("saved-entry status respects Singapore schedule boundaries without claiming a task ran", () => {
  const missing = {
    status: "ready" as const,
    data: { body: "", path: "example.md", hash: "", exists: false },
  };
  assert.equal(
    briefStatus(missing, "morning", new Date("2026-10-21T20:29:00Z")),
    "Not due yet",
  );
  assert.equal(
    briefStatus(missing, "morning", new Date("2026-10-21T20:30:00Z")),
    "No saved entry found",
  );
  assert.equal(
    briefStatus(missing, "evening", new Date("2026-10-22T12:59:00Z")),
    "Not due yet",
  );
  assert.equal(
    briefStatus(missing, "evening", new Date("2026-10-22T13:00:00Z")),
    "No saved entry found",
  );
  assert.equal(
    briefStatus({ status: "unavailable" }, "morning", now),
    "Unavailable",
  );
  assert.equal(
    briefStatus(
      { status: "ready", data: { ...missing.data, exists: true } },
      "morning",
      now,
    ),
    "Saved in EMDEE",
  );
});
test("product status distinguishes fresh, stale, invalid and future-dated signals", () => {
  const state = (generated_at: string) => ({
    status: "available" as const,
    data: { generated_at } as OwnerMetrics,
    fetched_at: now.toISOString(),
  });
  assert.equal(productSignal(state(now.toISOString()), now), "available");
  assert.equal(productSignal(state("2026-10-20T00:00:00Z"), now), "stale");
  assert.equal(productSignal(state("bad"), now), "unavailable");
  assert.equal(
    productSignal(state("2026-11-01T00:00:00Z"), now),
    "unavailable",
  );
});
function overview(mocks: Record<string, unknown>) {
  return load<typeof import("../lib/admin-overview/server")>(
    "lib/admin-overview/server.ts",
    {
      "@/lib/supabase-server": {
        supabaseAdmin: {
          from: () => {
            throw Error("source down");
          },
        },
      },
      "@/lib/daily/connections": { emdeeConnection: async () => null },
      "@/lib/daily/paths": { DAILY_PARENT: "example/DAILY.md" },
      "@/lib/daily/emdee": {},
      "@/lib/daily/model": dailyModel,
      "@/lib/cockpit-self": {
        getSelfMetrics: async () => {
          throw Error("unavailable");
        },
      },
      "@/lib/cockpit": {
        fetchRemoteWidgets: async () => ({
          emdee: { status: "pending", reason: "not connected" },
        }),
      },
      "./timing": {
        timedRead: (_: string, read: () => Promise<unknown>) => read(),
      },
      "./metrics-cache": {
        localMetricSnapshot: async () => {
          throw Error("unavailable");
        },
        remoteMetricSnapshot: async () => ({
          status: "pending",
          reason: "not connected",
        }),
      },
      "./model": overviewModel,
      ...mocks,
    },
  );
}
test("overview checks sole owner before touching any source", async () => {
  let touched = false;
  const api = overview({
    "@/lib/daily/server": {
      dailyOwner: async () => {
        throw Error("Owner required");
      },
      loadDailyTasks: async () => {
        touched = true;
      },
    },
  });
  await assert.rejects(api.loadAdminOverview(now), /Owner required/);
  assert.equal(touched, false);
});
test("one unavailable source does not erase the rest of the owner overview", async () => {
  const api = overview({
    "@/lib/daily/server": {
      dailyOwner: async () => "owner-fixture",
      loadDailyTasks: async () => ({
        active: [task("accepted")],
        completed: [],
      }),
    },
  });
  const result = await api.loadAdminOverview(now);
  assert.equal(result.focus.status, "ready");
  assert.equal(result.morning.status, "unavailable");
  assert.equal(result.growth.blog.status, "unavailable");
});
test("local metrics use real accounts, unknown revenue/workspaces and propagate query errors", async () => {
  const calls: { table: string; key: string; value: unknown }[] = [];
  let failure = false;
  const api = load<{ getSelfMetrics: () => Promise<OwnerMetrics> }>(
    "lib/cockpit-self.ts",
    {
      "./supabase-server": {
        supabaseAdmin: {
          from: (table: string) => {
            const builder = {
              select: () => builder,
              eq: (key: string, value: unknown) => {
                calls.push({ table, key, value });
                return builder;
              },
              gte: (key: string, value: unknown) => {
                calls.push({ table, key, value });
                return builder;
              },
              is: () => builder,
              then: (resolve: (value: unknown) => unknown) =>
                Promise.resolve({
                  count: table === "users" ? 2 : 7,
                  error: failure ? { message: "down" } : null,
                }).then(resolve),
            };
            return builder;
          },
        },
      },
    },
  );
  const data = await api.getSelfMetrics();
  assert.equal(data.business.signups_7d, 2);
  assert.equal(data.business.dau, 2);
  assert.equal(data.usage.website_visitors_24h, 7);
  assert.equal(data.business.arr_usd, null);
  assert.equal(data.business.active_workspaces, null);
  assert.ok(
    calls.some((c) => c.table === "users" && c.key === "first_seen_at"),
  );
  failure = true;
  await assert.rejects(api.getSelfMetrics(), /unavailable/);
});
test("remote metrics reject malformed or wrong-product payloads", async () => {
  const valid = {
    product: "emdee",
    generated_at: now.toISOString(),
    schema_version: 1,
    business: {
      dau: 1,
      wau: 2,
      mau: 3,
      arr_usd: null,
      signups_7d: 0,
      churn_30d: null,
      active_workspaces: 1,
    },
    usage: { reads: 4 },
    product_health: {
      uptime_pct_24h: null,
      error_rate_24h: null,
      latest_deploy_sha: null,
      npm_version: null,
    },
  };
  for (const payload of [
    valid,
    { ...valid, product: "other" },
    { ...valid, business: { ...valid.business, dau: "unknown" } },
    { ...valid, schema_version: 2 },
  ]) {
    const api = load<{
      fetchRemoteWidgets: () => Promise<{ emdee: { status: string } }>;
    }>(
      "lib/cockpit.ts",
      {},
      {
        fetch: async (_url: URL, init: RequestInit) => {
          assert.equal(init.redirect, "error");
          return Response.json(payload);
        },
      },
    );
    const result = await api.fetchRemoteWidgets();
    assert.equal(
      result.emdee.status,
      payload === valid ? "available" : "error",
    );
  }
});

test("overview priorities resolve without waiting for EMDEE and share one connection read", async () => {
  let connectionReads = 0,
    briefReads = 0;
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  const api = overview({
    "@/lib/daily/server": {
      dailyOwner: async () => "test-owner",
      loadDailyTasks: async () => ({ active: [], completed: [] }),
    },
    "@/lib/daily/connections": {
      emdeeConnection: async () => {
        connectionReads++;
        return { parentPath: "example/DAILY.md" };
      },
    },
    "@/lib/daily/emdee": {
      loadBriefWithConnection: async () => {
        briefReads++;
        await blocked;
        return { body: "saved", path: "fixture", hash: "hash", exists: true };
      },
    },
  });
  const sources = await api.loadAdminOverviewSources(now);
  assert.equal((await sources.focus).status, "ready");
  assert.equal(connectionReads, 1);
  assert.equal(briefReads, 3);
  release();
  assert.equal((await sources.morning).status, "ready");
  await api.collectAdminOverview(sources);
});

test("direct EMDEE reads need one request and only explicit absence becomes missing", async () => {
  const calls: string[] = [];
  let failure: string | null = null;
  const api = load<typeof import("../lib/daily/emdee-client")>(
    "lib/daily/emdee-client.ts",
    {},
    {
      AbortSignal,
      fetch: async (_: unknown, init: { body: string }) => {
        calls.push(JSON.parse(init.body).params.name);
        if (failure === "rpc-missing" || failure === "rpc-other") {
          const path = JSON.parse(init.body).params.arguments.path;
          return Response.json({
            error: {
              code: -32603,
              message:
                failure === "rpc-missing"
                  ? `no such doc: ${path}`
                  : "EMDEE upstream unavailable",
            },
          });
        }
        return Response.json({
          result: {
            isError: !!failure,
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  failure
                    ? { error: failure }
                    : {
                        content: "## Notes\n\nSaved",
                        sections: [],
                        doc_content_hash: "fixture",
                      },
                ),
              },
            ],
          },
        });
      },
    },
  );
  const connection = {
    parentPath: "fixture",
    token: "test-only",
    expiresAt: Date.now() + 60000,
  };
  assert.ok(await api.readEmdee(connection, "fixture/doc.md"));
  assert.deepEqual(calls, ["get_doc"]);
  failure = "no_such_doc";
  assert.equal(await api.readEmdee(connection, "fixture/missing.md"), null);
  failure = "rpc-missing";
  assert.equal(await api.readEmdee(connection, "fixture/rpc-missing.md"), null);
  failure = "rpc-other";
  await assert.rejects(api.readEmdee(connection, "fixture/rpc-error.md"));
  failure = "forbidden";
  await assert.rejects(api.readEmdee(connection, "fixture/private.md"));
});

test("brief preview keeps complete Markdown blocks and ignores headings inside fences", () => {
  assert.equal(
    briefPreview("### Morning\n\nIntro.\n\n### Sources\nLong sources"),
    "### Morning\n\nIntro.",
  );
  const code =
    "### Morning\n\n```md\n### Inside code\n```\n\n### Sources\nLater";
  assert.equal(
    briefPreview(code),
    "### Morning\n\n```md\n### Inside code\n```",
  );
  assert.equal(
    briefPreview("Intro\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n### Later\nText"),
    "Intro\n\n| A | B |\n|---|---|\n| 1 | 2 |",
  );
});

test("daily active and completed reads start together and retain owner filters", async () => {
  const owners: string[] = [];
  const resolvers: ((value: { data: unknown[]; error: null }) => void)[] = [];
  const api = load<typeof import("../lib/daily/server")>(
    "lib/daily/server.ts",
    {
      "next/navigation": {
        notFound: () => {
          throw Error("denied");
        },
      },
      "@/lib/admin-policy": { isOwnerUser: () => true },
      "@/lib/users": { ensureUserRow: async () => ({ id: "test-owner" }) },
      "@/lib/supabase-server": {
        supabaseAdmin: {
          from: () => {
            const chain = {
              select: () => chain,
              eq: (key: string, value: string) => {
                if (key === "owner_id") owners.push(value);
                return chain;
              },
              not: () => chain,
              order: () => chain,
              limit: () =>
                new Promise<{ data: unknown[]; error: null }>((resolve) =>
                  resolvers.push(resolve),
                ),
            };
            return chain;
          },
        },
      },
    },
  );
  const pending = api.loadDailyTasks(day);
  await new Promise(setImmediate);
  assert.equal(resolvers.length, 2);
  assert.deepEqual(owners, ["test-owner", "test-owner"]);
  for (const resolve of resolvers) resolve({ data: [], error: null });
  const result = await pending;
  assert.equal(result.active.length, 0);
  assert.equal(result.completed.length, 0);
});
