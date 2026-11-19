import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import {
  directoryEntries,
  type DirectoryAccount,
  type DirectoryPerson,
} from "../lib/admin-users/model";
import * as directoryModel from "../lib/admin-users/model";
function load<T>(file: string, mocks: Record<string, unknown>) {
  const source = ts.transpileModule(
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
  const actual = createRequire(import.meta.url);
  vm.runInNewContext(source, {
    module: testModule,
    exports: testModule.exports,
    require: (name: string) =>
      name === "server-only" ? {} : name in mocks ? mocks[name] : actual(name),
  });
  return testModule.exports as T;
}
const account: DirectoryAccount = {
  id: "account-a",
  name: "Example Person",
  email: "member@example.invalid",
  supabase_auth_user_id: "auth-a",
};
const person: DirectoryPerson = {
  id: "person-a",
  team_id: "team-a",
  display_name: "Example Person",
  email: "member@example.invalid",
};
test("activation depends on stable explicit identity links, never matching names or email", () => {
  let result = directoryEntries([account], [person], []);
  assert.deepEqual(result.map((e) => e.status).sort(), [
    "not-activated",
    "not-assigned",
  ]);
  const link = {
    team_id: "team-a",
    person_id: "person-a",
    user_id: "account-a",
    access_role: "member",
  };
  result = directoryEntries([account], [person], [link]);
  assert.equal(result.length, 1);
  assert.equal(result[0].status, "activated");
  assert.equal(
    directoryEntries(
      [{ ...account, email: "changed@example.invalid" }],
      [person],
      [link],
    )[0].status,
    "activated",
  );
  assert.equal(
    directoryEntries(
      [{ ...account, supabase_auth_user_id: null }],
      [person],
      [link],
    )[0].status,
    "not-activated",
  );
  assert.equal(
    directoryEntries([account], [person], [{ ...link, team_id: "wrong-team" }])
      .length,
    2,
  );
});
test("independent member gate rejects missing sign-in, missing assignment and lookup errors", async () => {
  let user: DirectoryAccount | null = null;
  let assigned = false;
  let unavailable = false;
  let checks = 0;
  const api = load<{ requireAssignedUser: () => Promise<DirectoryAccount> }>(
    "lib/app-access.ts",
    {
      react: { cache: (fn: unknown) => fn },
      "@/lib/users": { ensureUserRow: async () => user },
      "@/lib/team-assignment": {
        hasTeamAssignment: async (id: string) => {
          checks++;
          assert.equal(id, account.id);
          if (unavailable) throw Error("lookup unavailable");
          return assigned;
        },
      },
    },
  );
  await assert.rejects(api.requireAssignedUser(), /Sign in/);
  assert.equal(checks, 0);
  user = account;
  await assert.rejects(api.requireAssignedUser(), /assignment/);
  assigned = true;
  assert.equal((await api.requireAssignedUser()).id, account.id);
  unavailable = true;
  await assert.rejects(api.requireAssignedUser(), /unavailable/);
});
test("assignment lookup is scoped to the stored account and fcOS team, and fails closed", async () => {
  const filters: [string, string][] = [];
  let data: unknown = null;
  let error: unknown = null;
  const builder = {
    select: () => builder,
    eq: (key: string, value: string) => {
      filters.push([key, value]);
      return builder;
    },
    limit: () => builder,
    maybeSingle: async () => ({ data, error }),
  };
  const api = load<{ hasTeamAssignment: (id: string) => Promise<boolean> }>(
    "lib/team-assignment.ts",
    { "@/lib/supabase-server": { supabaseAdmin: { from: () => builder } } },
  );
  assert.equal(await api.hasTeamAssignment(account.id), false);
  assert.ok(
    filters.some(([key, value]) => key === "user_id" && value === account.id),
  );
  assert.ok(
    filters.some(
      ([key, value]) =>
        key === "business_teams.slug" && value === "whatelz-network",
    ),
  );
  data = { person_id: person.id };
  assert.equal(await api.hasTeamAssignment(account.id), true);
  error = { message: "down" };
  await assert.rejects(
    api.hasTeamAssignment(account.id),
    /could not be checked/,
  );
});
test("directory refuses partial roster pages instead of misclassifying users", async () => {
  let owner = false;
  let incomplete = false;
  const ranges: number[] = [];
  const db = {
    from(table: string) {
      let start = 0;
      const rows =
        table === "users"
          ? Array.from({ length: 1001 }, (_, i) => ({
              ...account,
              id: `account-${i}`,
            }))
          : table === "business_team_people"
            ? [person]
            : [];
      const builder = {
        select: () => builder,
        eq: () => builder,
        not: () => builder,
        order: () => builder,
        range: (from: number) => {
          start = from;
          ranges.push(from);
          return builder;
        },
        maybeSingle: async () => ({
          data: { id: "team-a", name: "Fixture" },
          error: null,
        }),
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve({
            data: incomplete ? [] : rows.slice(start, start + 1000),
            error: null,
            count: rows.length,
          }).then(resolve),
      };
      return builder;
    },
  };
  const api = load<{
    loadUserDirectory: () => Promise<{ entries: unknown[] }>;
  }>("lib/admin-users/server.ts", {
    "@/lib/daily/server": {
      dailyOwner: async () => {
        if (!owner) throw Error("Owner required");
      },
    },
    "@/lib/supabase-server": { supabaseAdmin: db },
    "@/lib/team-assignment": { FCOS_TEAM_SLUG: "fixture" },
    "./model": directoryModel,
  });
  await assert.rejects(api.loadUserDirectory(), /Owner required/);
  assert.equal(ranges.length, 0);
  owner = true;
  assert.equal((await api.loadUserDirectory()).entries.length, 1002);
  assert.ok(ranges.includes(1000));
  incomplete = true;
  await assert.rejects(api.loadUserDirectory(), /incomplete/);
});

test("unassigned owner cannot reach Chat allowance or provider access", async () => {
  let reads = 0;
  const api = load<{ memberActor: () => Promise<unknown> }>(
    "lib/member-ai/server.ts",
    {
      "@/lib/users": { ensureUserRow: async () => account },
      "@/lib/admin-policy": { isOwnerUser: () => true },
      "@/lib/team-assignment": { hasTeamAssignment: async () => false },
      "@/lib/supabase-server": {
        supabaseAdmin: {
          from: () => {
            reads++;
            throw Error("must not read allowance");
          },
        },
      },
      "@/lib/daily/connections": {},
      "./model": {},
    },
  );
  await assert.rejects(api.memberActor(), /assignment/);
  assert.equal(reads, 0);
});

test("tree assignment action rejects unregistered accounts and never replaces a link", async () => {
  let owner = false,
    registered = false,
    inserted = 0;
  const id = "00000000-0000-4000-8000-000000000001";
  const api = load<{ linkTeamAccount: (form: FormData) => Promise<void> }>(
    "app/admin/team/actions.ts",
    {
      "next/cache": { revalidatePath: () => {} },
      "@/lib/users": {
        requireAdmin: async () => {
          if (!owner) throw Error("Owner required");
        },
      },
      "@/lib/supabase-server": {
        supabaseAdmin: {
          from: () => {
            const builder = {
              select: () => builder,
              eq: () => builder,
              maybeSingle: async () => ({
                data: {
                  id,
                  email: "fixture@example.invalid",
                  supabase_auth_user_id: registered ? "auth-fixture" : null,
                },
                error: null,
              }),
              insert: async () => {
                inserted++;
                return { error: null };
              },
            };
            return builder;
          },
        },
      },
    },
  );
  const form = new FormData();
  for (const key of ["team_id", "person_id", "user_id"]) form.set(key, id);
  form.set("access_role", "member");
  await assert.rejects(api.linkTeamAccount(form), /Owner required/);
  assert.equal(inserted, 0);
  owner = true;
  await assert.rejects(api.linkTeamAccount(form), /signed-in/);
  assert.equal(inserted, 0);
  registered = true;
  await api.linkTeamAccount(form);
  assert.equal(inserted, 1);
});
