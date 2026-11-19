import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as roles from "../lib/weos-roles";
function loader(role: string, abo = "ABO", linked = true) {
  const calls: { table: string; method: string; args: unknown[] }[] = [];
  const db = {
    from: (table: string) => {
      const q: Record<string, unknown> = {};
      for (const method of ["select", "eq", "in"]) {
        q[method] = (...args: unknown[]) => {
          calls.push({ table, method, args });
          return q;
        };
      }
      q.then = (resolve: (x: unknown) => unknown) =>
        Promise.resolve({
          error: null,
          data:
            table === "business_team_accounts"
              ? linked
                ? [
                    {
                      team_id: "t",
                      person_id: "p",
                      business_team_people: { abo_status: abo },
                    },
                  ]
                : []
              : [{ team_id: "t", person_id: "p", role_code: role }],
        }).then(resolve);
      return q;
    },
  };
  const mocks: Record<string, unknown> = {
    "server-only": {},
    react: { cache: (fn: unknown) => fn },
    "next/headers": { cookies: async () => ({ get: () => undefined }) },
    "./supabase-server": { supabaseAdmin: db },
    "./users": { ensureUserRow: async () => null },
    "./admin-policy": {
      isOwnerUser: (u: { id: string } | null) => u?.id === "configured-owner",
    },
    "./weos-roles": roles,
  };
  const code = ts.transpileModule(
    fs.readFileSync(
      new URL("../lib/weos-role-server.ts", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const loadedModule = { exports: {} };
  vm.runInNewContext(code, {
    module: loadedModule,
    exports: loadedModule.exports,
    require: (key: string) => {
      if (!(key in mocks)) throw Error("Unexpected import " + key);
      return mocks[key];
    },
  });
  return {
    calls,
    stored: (
      loadedModule.exports as {
        storedWeosRole: (
          u: { id: string; role: string } | null,
        ) => Promise<string>;
      }
    ).storedWeosRole,
  };
}
test("stored roles require an active Whatelz membership linked to the verified account", async () => {
  const m = loader("blaze");
  assert.equal(await m.stored({ id: "member", role: "unauthorized" }), "blaze");
  assert.ok(
    m.calls.some(
      (c) =>
        c.table === "business_team_accounts" &&
        c.method === "eq" &&
        c.args[0] === "user_id" &&
        c.args[1] === "member",
    ),
  );
  assert.ok(
    m.calls.some(
      (c) =>
        c.table === "weos_community_memberships" &&
        c.method === "eq" &&
        c.args[0] === "weos_communities.slug" &&
        c.args[1] === "whatelz",
    ),
  );
  assert.ok(
    m.calls.some(
      (c) =>
        c.method === "eq" && c.args[0] === "status" && c.args[1] === "active",
    ),
  );
  assert.equal(
    await loader("torch", "ABO", false).stored({ id: "member", role: "admin" }),
    "guest",
  );
  assert.equal(
    await loader("catalyst").stored({ id: "member", role: "admin" }),
    "guest",
  );
});
test("only the configured owner is Beacon; Torch requires a recorded ABO status", async () => {
  assert.equal(
    await loader("beacon").stored({ id: "member", role: "superadmin" }),
    "guest",
  );
  assert.equal(
    await loader("guest").stored({
      id: "configured-owner",
      role: "superadmin",
    }),
    "beacon",
  );
  assert.equal(
    await loader("torch", "ABO").stored({ id: "member", role: "unauthorized" }),
    "torch",
  );
  for (const abo of ["Unknown", "Not ABO"])
    assert.equal(
      await loader("torch", abo).stored({ id: "member", role: "unauthorized" }),
      "ember",
    );
  assert.equal(await loader("ember").stored(null), "guest");
});
