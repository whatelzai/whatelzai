import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createRequire } from "node:module";
import * as model from "../lib/leads/model";
const requireNode = createRequire(import.meta.url);
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
  const testModule = { exports: {} };
  vm.runInNewContext(code, {
    module: testModule,
    exports: testModule.exports,
    require: (name: string) =>
      name === "server-only"
        ? {}
        : name in mocks
          ? mocks[name]
          : requireNode(name),
    Date,
    FormData,
  });
  return testModule.exports as T;
}
test("lead plans query is restricted to verified owner and displayed lead IDs; source failures stay explicit", async () => {
  for (const fail of [false, true]) {
    const calls: { table: string; method: string; args: unknown[] }[] = [];
    const server = load<{
      loadLeads: (
        params: object,
      ) => Promise<{ plansUnavailable: boolean; upcoming: unknown[] }>;
    }>("lib/leads/server.ts", {
      "@/lib/app-access": {
        requireAssignedUser: async () => ({ id: "verified-owner" }),
      },
      "./model": model,
      "./sharing": {},
      "@/lib/supabase-server": {
        supabaseAdmin: {
          from: (table: string) => {
            const result =
              table === "member_leads"
                ? {
                    data: [{ id: "own-lead", is_priority: true }],
                    count: 1,
                    error: null,
                  }
                : {
                    data: fail
                      ? null
                      : [
                          {
                            lead_id: "own-lead",
                            title: "MMI",
                            activity_on: "2026-10-30",
                            status: "Planned",
                          },
                        ],
                    error: fail ? { message: "unavailable" } : null,
                  };
            const query = {
              select(...args: unknown[]) {
                calls.push({ table, method: "select", args });
                return this;
              },
              eq(...args: unknown[]) {
                calls.push({ table, method: "eq", args });
                return this;
              },
              in(...args: unknown[]) {
                calls.push({ table, method: "in", args });
                return this;
              },
              gte(...args: unknown[]) {
                calls.push({ table, method: "gte", args });
                return this;
              },
              order() {
                return this;
              },
              range() {
                return this;
              },
              limit() {
                return this;
              },
              then(resolve: (v: unknown) => void) {
                resolve(result);
              },
            };
            return query;
          },
        },
      },
    });
    const data = await server.loadLeads({});
    assert.equal(data.plansUnavailable, fail);
    assert.equal(data.upcoming.length, fail ? 0 : 1);
    for (const table of ["member_leads", "member_lead_activities"])
      assert.ok(
        calls.some(
          (c) =>
            c.table === table &&
            c.method === "eq" &&
            c.args[0] === "owner_id" &&
            c.args[1] === "verified-owner",
        ),
      );
    const ids = calls.find(
      (c) =>
        c.table === "member_lead_activities" &&
        c.method === "in" &&
        c.args[0] === "lead_id",
    )!;
    assert.equal(JSON.stringify(ids.args[1]), '["own-lead"]');
  }
});
test("priority mutation ignores forged owner and guards record revision", async () => {
  const calls: unknown[][] = [];
  const actions = load<{
    setLeadPriority: (
      state: object,
      form: FormData,
    ) => Promise<{ error?: string }>;
  }>("app/leads/actions.ts", {
    "next/cache": { revalidatePath: () => {} },
    "next/navigation": {},
    "@/lib/leads/server": { leadOwner: async () => "verified-owner" },
    "@/lib/leads/model": model,
    "@/lib/supabase-server": {
      supabaseAdmin: {
        from: () => ({
          update(fields: unknown) {
            calls.push(["update", fields]);
            return this;
          },
          eq(...args: unknown[]) {
            calls.push(args);
            return this;
          },
          select() {
            return this;
          },
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      },
    },
  });
  const form = new FormData();
  form.set("id", "11111111-1111-4111-8111-111111111111");
  form.set("revision", "3");
  form.set("priority", "true");
  form.set("owner_id", "forged");
  form.set("$ACTION_FAKE", "ignored");
  const result = await actions.setLeadPriority({}, form);
  assert.ok(result.error);
  assert.ok(
    calls.some((x) => x[0] === "owner_id" && x[1] === "verified-owner"),
  );
  assert.ok(calls.some((x) => x[0] === "revision" && x[1] === 3));
  assert.equal((calls[0][1] as { is_priority: boolean }).is_priority, true);
});
