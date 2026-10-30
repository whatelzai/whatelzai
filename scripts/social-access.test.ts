import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { isOwnerUser } from "../lib/admin-policy";
const owner = "11111111-1111-4111-8111-111111111111";
const requireNode = createRequire(import.meta.url);
function load(user: { id: string; role: string } | null) {
  const testModule = {
    exports: {} as Record<string, (...args: unknown[]) => Promise<unknown>>,
  };
  const source = ts.transpileModule(
    readFileSync(new URL("../lib/social/server.ts", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const mocks: Record<string, unknown> = {
    "server-only": {},
    "@/lib/app-access": {
      requireAssignedUser: async () => {
        if (!user) throw Error("Sign in");
        return user;
      },
    },
    "@/lib/admin-policy": {
      isOwnerUser: (u: { id: string; role: string }) => isOwnerUser(u, owner),
    },
    "@/lib/supabase-server": {
      supabaseAdmin: {
        from: () => {
          throw Error("Database should not be touched");
        },
      },
    },
    "@/lib/daily/crypto": {},
  };
  vm.runInNewContext(source, {
    module: testModule,
    exports: testModule.exports,
    require: (name: string) =>
      name in mocks
        ? mocks[name]
        : requireNode(
            name.startsWith("./") ? `../lib/social/${name.slice(2)}` : name,
          ),
    process: { env: { WHATELZ_OWNER_USER_ID: owner } },
    Buffer,
    Date,
    console,
  });
  return testModule.exports;
}
test("pilot requires stable owner, privileged role and verified assigned user", async () => {
  for (const user of [
    null,
    { id: "22222222-2222-4222-8222-222222222222", role: "superadmin" },
    { id: owner, role: "member" },
  ])
    await assert.rejects(() => load(user).socialOwner());
  assert.equal(
    await load({ id: owner, role: "superadmin" }).socialOwner(),
    owner,
  );
});
test("social context cannot read another member’s private posts", async () => {
  const result = (await load({ id: owner, role: "superadmin" }).readSocialPosts(
    "22222222-2222-4222-8222-222222222222",
    "",
  )) as { items: unknown[] };
  assert.equal(result.items.length, 0);
});
test("callback browser state rejects missing, malformed and different values", async () => {
  const api = load({ id: owner, role: "superadmin" });
  const a = "a".repeat(43),
    b = "b".repeat(43);
  assert.equal(await api.sameState(a, a), true);
  for (const pair of [
    [a, b],
    ["", a],
    [a, ""],
    ["!".repeat(43), "!".repeat(43)],
  ])
    assert.equal(await api.sameState(...pair), false);
});
