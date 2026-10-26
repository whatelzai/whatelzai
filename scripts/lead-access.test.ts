import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createRequire } from "node:module";
import * as model from "../lib/leads/model";
const req = createRequire(import.meta.url);
function load<T>(file: string, mocks: Record<string, unknown>) {
  const code = ts.transpileModule(
    fs.readFileSync(new URL("../" + file, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(code, {
    module: mod,
    exports: mod.exports,
    require: (key: string) =>
      key === "server-only" ? {} : key in mocks ? mocks[key] : req(key),
    Date,
    FormData,
    File,
    Buffer,
  });
  return mod.exports as T;
}
function chain(data: unknown, log: { method: string; args: unknown[] }[]) {
  const q: Record<string, unknown> = {};
  for (const method of [
    "select",
    "eq",
    "ilike",
    "in",
    "order",
    "limit",
    "maybeSingle",
    "or",
    "contains",
  ])
    q[method] = (...args: unknown[]) => {
      log.push({ method, args });
      return q;
    };
  q.then = (resolve: (r: unknown) => unknown) =>
    Promise.resolve({ data, error: null }).then(resolve);
  return q;
}
test("Chat reads priority profiles and actual activities; shared context omits private fields", async () => {
  const logs: {
    table: string;
    calls: { method: string; args: unknown[] }[];
  }[] = [];
  let profiles = 0;
  const context = load<{
    readLeadContext: (
      q: string,
    ) => Promise<{ items: Record<string, unknown>[]; coverage: string }>;
  }>("lib/leads/context.ts", {
    "@/lib/fcos/sharing": {
      sharedBriefingIds: async () => [{ id: "team-note", owner_id: "other" }],
    },
    "./server": { leadOwner: async () => "viewer" },
    "./model": model,
    "./sharing": {
      sharedLeadIds: async () => [{ id: "shared", owner_id: "other" }],
      sharedLeadColumns: "id,name,story",
    },
    "@/lib/supabase-server": {
      supabaseAdmin: {
        from: (table: string) => {
          const calls: { method: string; args: unknown[] }[] = [];
          logs.push({ table, calls });
          return chain(
            table === "member_leads"
              ? [
                  {
                    id: profiles++ === 0 ? "own" : "shared",
                    name: "Fixture",
                    story: "Story",
                    interests: "Books",
                    concerns: "Time",
                    next_action: "Meet",
                    notes: "PRIVATE",
                    email: "SECRET",
                    photo_path: "PRIVATE_PATH",
                  },
                ]
              : table === "member_briefings"
                ? [
                    {
                      id: "team-note",
                      title: "Session",
                      kind: "HQH",
                      status: "draft",
                      observations: "Known",
                      reflections: "Approach",
                      next_steps: "Ask",
                    },
                  ]
                : [
                    {
                      title: "Badminton",
                      activity_on: "2026-10-27",
                      status: "Tentative",
                    },
                  ],
            calls,
          );
        },
      },
    },
  });
  const r = await context.readLeadContext("Fixture");
  assert.equal(r.items.length, 2);
  assert.equal(r.items[0].notes, "PRIVATE");
  assert.equal(r.items[1].notes, undefined);
  for (const item of r.items) {
    assert.equal(item.email, undefined);
    assert.equal(item.photo_path, undefined);
    assert.equal(
      (item.activities as { status: string }[])[0].status,
      "Tentative",
    );
  }
  assert.ok(
    logs[0].calls.some(
      (x) =>
        x.method === "eq" && x.args[0] === "owner_id" && x.args[1] === "viewer",
    ),
  );
  assert.ok(
    logs[0].calls.some(
      (x) => x.method === "order" && x.args[0] === "is_priority",
    ),
  );
  assert.ok(
    logs[1].calls.some(
      (x) =>
        x.method === "in" &&
        x.args[0] === "id" &&
        JSON.stringify(x.args[1]) === '["shared"]',
    ),
  );
  assert.ok(
    logs[2].calls.some(
      (x) =>
        x.method === "eq" && x.args[0] === "owner_id" && x.args[1] === "viewer",
    ),
  );
  assert.ok(
    logs[3].calls.some(
      (x) =>
        x.method === "eq" && x.args[0] === "owner_id" && x.args[1] === "other",
    ),
  );
  assert.match(r.coverage, /NOT attendance/);
  assert.equal(
    (r.items[1].linkedNotes as { title: string }[])[0].title,
    "Session",
  );
  for (const log of logs.filter((x) => x.table === "member_briefings")) {
    assert.ok(
      log.calls.some(
        (x) => x.method === "or" && String(x.args[0]).includes("team-note"),
      ),
    );
    assert.ok(
      log.calls.some(
        (x) => x.method === "contains" && x.args[0] === "lead_ids",
      ),
    );
  }
});
test("Profile/photo access denies foreign IDs by default and rechecks grants after revocation", async () => {
  let permitted = false;
  let reads = 0;
  const server = load<{
    leadAccess: (id: string) => Promise<{ canEdit: boolean } | null>;
  }>("lib/leads/server.ts", {
    "@/lib/app-access": { requireAssignedUser: async () => ({ id: "viewer" }) },
    "./model": model,
    "./sharing": {
      sharedLeadIds: async () =>
        permitted ? [{ id: "shared", owner_id: "other" }] : [],
      sharedLeadColumns: "id,name,story",
    },
    "@/lib/supabase-server": {
      supabaseAdmin: {
        from: () => {
          const calls: { method: string; args: unknown[] }[] = [];
          reads++;
          const q = chain(null, calls);
          q.maybeSingle = () =>
            Promise.resolve({
              data: calls.some(
                (x) =>
                  x.method === "eq" &&
                  x.args[0] === "owner_id" &&
                  x.args[1] === "other",
              )
                ? { id: "shared", owner_id: "other", photo_path: "private" }
                : null,
              error: null,
            });
          return q;
        },
      },
    },
  });
  assert.equal(await server.leadAccess("shared"), null);
  assert.equal(reads, 1);
  permitted = true;
  assert.equal((await server.leadAccess("shared"))?.canEdit, false);
  permitted = false;
  assert.equal(await server.leadAccess("shared"), null);
});
test("Sharing actions reject unapproved recipients and derive owner from the session", async () => {
  let params: Record<string, unknown> | undefined;
  const actions = load<{
    saveVisibility: (
      s: object,
      f: FormData,
    ) => Promise<{ error?: string; success?: string }>;
  }>("app/leads/profile-actions.ts", {
    "next/cache": { revalidatePath: () => {} },
    "@/lib/leads/server": { leadOwner: async () => "verified-owner" },
    "@/lib/fcos/sharing": {
      shareRecipients: async () => [
        { id: "22222222-2222-4222-8222-222222222222" },
      ],
    },
    "@/lib/leads/photo": {},
    "@/lib/supabase-server": {
      supabaseAdmin: {
        rpc: async (_name: string, p: Record<string, unknown>) => {
          params = p;
          return { data: true, error: null };
        },
      },
    },
  });
  const form = new FormData();
  form.set("recipient", "33333333-3333-4333-8333-333333333333");
  form.set("mode", "all");
  form.set("revision", "0");
  form.set("owner_id", "forged");
  assert.ok((await actions.saveVisibility({}, form)).error);
  assert.equal(params, undefined);
  form.set("recipient", "22222222-2222-4222-8222-222222222222");
  assert.ok((await actions.saveVisibility({}, form)).success);
  assert.equal(
    (params as Record<string, unknown> | undefined)?.p_owner,
    "verified-owner",
  );
});

test("record hiding derives owner from session and guards stale revisions", async () => {
  for (const present of [true, false]) {
    const filters: unknown[][] = [];
    let patch: Record<string, unknown> | undefined;
    const actions = load<{
      saveLeadPrivacy: (
        s: object,
        f: FormData,
      ) => Promise<{ error?: string; success?: string }>;
    }>("app/leads/profile-actions.ts", {
      "next/cache": { revalidatePath: () => {} },
      "@/lib/leads/server": { leadOwner: async () => "verified-owner" },
      "@/lib/fcos/sharing": {},
      "@/lib/leads/photo": {},
      "@/lib/supabase-server": {
        supabaseAdmin: {
          from: (table: string) => {
            assert.equal(table, "member_leads");
            return {
              update(value: Record<string, unknown>) {
                patch = value;
                return this;
              },
              eq(...args: unknown[]) {
                filters.push(args);
                return this;
              },
              select() {
                return this;
              },
              maybeSingle: async () => ({
                data: present ? { id: "fixture" } : null,
                error: null,
              }),
            };
          },
        },
      },
    });
    const form = new FormData();
    form.set("id", "00000000-0000-4000-8000-000000000001");
    form.set("revision", "3");
    form.set("visibility", "private");
    form.set("owner_id", "forged");
    const result = await actions.saveLeadPrivacy({}, form);
    assert.equal(Boolean(result.success), present);
    assert.equal(Boolean(result.error), !present);
    assert.equal(patch?.visibility, "private");
    assert.equal(patch?.revision, 4);
    assert.ok(
      filters.some((x) => x[0] === "owner_id" && x[1] === "verified-owner"),
    );
    assert.ok(filters.some((x) => x[0] === "revision" && x[1] === 3));
  }
});

test(
  "authorized profile and activity reads start together without widening their owner scope",
  { timeout: 1500 },
  async () => {
    const starts: string[] = [];
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = async (name: string, data: unknown) => {
      starts.push(name);
      if (starts.length === 2) release();
      await barrier;
      return { data, error: null };
    };
    let profiles = 0;
    const queries: { table: string; filters: unknown[][] }[] = [];
    const server = load<{
      loadLead: (id: string) => Promise<{ canEdit: boolean }>;
    }>("lib/leads/server.ts", {
      "@/lib/app-access": {
        requireAssignedUser: async () => ({ id: "viewer" }),
      },
      "./model": model,
      "./sharing": {
        sharedLeadIds: async () => [],
        sharedLeadColumns: "id,name",
      },
      "@/lib/supabase-server": {
        supabaseAdmin: {
          from: (table: string) => {
            const item = { table, filters: [] as unknown[][] };
            queries.push(item);
            const q: Record<string, unknown> = {};
            for (const method of ["select", "eq", "order", "limit"])
              q[method] = (...args: unknown[]) => {
                if (method === "eq") item.filters.push(args);
                return q;
              };
            if (table === "member_leads")
              q.maybeSingle = () =>
                profiles++ === 0
                  ? Promise.resolve({
                      data: { id: "profile", owner_id: "viewer" },
                      error: null,
                    })
                  : started("profile", {
                      id: "profile",
                      name: "Fixture",
                      photo_path: null,
                    });
            else
              q.then = (resolve: (r: unknown) => unknown) =>
                started("activities", []).then(resolve);
            return q;
          },
        },
      },
    });
    assert.equal((await server.loadLead("profile")).canEdit, true);
    assert.deepEqual(starts.sort(), ["activities", "profile"]);
    for (const query of queries)
      assert.ok(
        query.filters.some((x) => x[0] === "owner_id" && x[1] === "viewer"),
      );
  },
);
