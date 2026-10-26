import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import { test } from "node:test";
import ts from "typescript";
import * as model from "../lib/team/model";
import type { TeamView } from "../lib/team/server";

test("team focus follows each verified account link, with unlinked members denied", async () => {
  const teamId = randomUUID();
  const ownerPerson = randomUUID();
  const memberPerson = randomUUID();
  const ownerUser = randomUUID();
  const memberUser = randomUUID();
  let userId = ownerUser;
  const links = new Map([
    [ownerUser, { person_id: ownerPerson, access_role: "manager" }],
    [memberUser, { person_id: memberPerson, access_role: "member" }],
  ]);
  const people = [
    {
      id: ownerPerson,
      team_id: teamId,
      display_name: "Test sponsor",
      sponsor_person_id: null,
      context: null,
    },
    {
      id: memberPerson,
      team_id: teamId,
      display_name: "Test member",
      sponsor_person_id: ownerPerson,
      context: null,
    },
  ];
  const source = ts.transpileModule(
    readFileSync(new URL("../lib/team/server.ts", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const testModule = { exports: {} };
  const actual = createRequire(import.meta.url);
  const mocks: Record<string, unknown> = {
    "server-only": {},
    "./model": model,
    "@/lib/admin-policy": {
      isOwnerUser: (user: { id: string }) => user.id === ownerUser,
    },
    "@/lib/users": { ensureUserRow: async () => ({ id: userId }) },
    "@/lib/supabase-server": {
      supabaseAdmin: {
        from(table: string) {
          const filters = new Map<string, string>();
          const result = () => {
            if (table === "business_teams")
              return {
                data: {
                  id: teamId,
                  slug: "test-network",
                  name: "Test network",
                  focus_person_id: ownerPerson,
                },
                error: null,
              };
            if (table === "business_team_accounts") {
              assert.equal(filters.get("team_id"), teamId);
              assert.equal(filters.get("user_id"), userId);
              return { data: links.get(userId) ?? null, error: null };
            }
            assert.equal(table, "business_team_people");
            assert.equal(filters.get("team_id"), teamId);
            return { data: people, error: null };
          };
          const query = {
            select: () => query,
            eq: (key: string, value: string) => {
              filters.set(key, value);
              return query;
            },
            order: () => query,
            maybeSingle: async () => result(),
            then: (
              resolve: (value: unknown) => unknown,
              reject: (reason: unknown) => unknown,
            ) => Promise.resolve(result()).then(resolve, reject),
          };
          return query;
        },
      },
    },
  };
  vm.runInNewContext(source, {
    module: testModule,
    exports: testModule.exports,
    require: (name: string) => (name in mocks ? mocks[name] : actual(name)),
  });
  const { loadTeamView } = testModule.exports as {
    loadTeamView: () => Promise<TeamView | null>;
  };
  assert.equal((await loadTeamView())?.focusId, ownerPerson);
  userId = memberUser;
  const memberView = await loadTeamView();
  assert.equal(memberView?.focusId, memberPerson);
  assert.equal(memberView?.canSeeAll, false);
  assert.ok(memberView?.people.some((person) => person.id === memberPerson));
  userId = randomUUID();
  assert.equal(await loadTeamView(), null);
});
