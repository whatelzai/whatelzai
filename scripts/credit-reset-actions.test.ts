import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import * as resets from "../lib/member-ai/resets";
const member = "11111111-1111-4111-8111-111111111111";
function action(owner = true, failure = false) {
  const calls: Record<string, unknown>[] = [];
  const source = ts.transpileModule(
    readFileSync(
      new URL("../app/admin/users/credit-actions.ts", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const loaded = { exports: {} };
  const actual = createRequire(import.meta.url);
  const mocks: Record<string, unknown> = {
    "next/cache": { revalidatePath: () => {} },
    "@/lib/daily/server": {
      dailyOwner: async () => {
        if (!owner) throw Error("Owner required");
        return "configured-owner";
      },
    },
    "@/lib/supabase-server": {
      supabaseAdmin: {
        rpc: async (name: string, args: Record<string, unknown>) => {
          calls.push({ name, ...args });
          return {
            data: [{ user_id: member }],
            error: failure ? { message: "unavailable" } : null,
          };
        },
      },
    },
    "@/lib/member-ai/resets": resets,
  };
  vm.runInNewContext(source, {
    module: loaded,
    exports: loaded.exports,
    require: (name: string) => (name in mocks ? mocks[name] : actual(name)),
  });
  return {
    ...(loaded.exports as {
      resetCredits: (
        input: unknown,
      ) => Promise<{ error?: string; success?: string }>;
    }),
    calls,
  };
}
test("reset actions independently require owner and reject duplicated or oversized targets", async () => {
  const denied = action(false);
  await assert.rejects(denied.resetCredits({}), /Owner required/);
  assert.equal(denied.calls.length, 0);
  const api = action();
  const target = { userId: member, cycle: null };
  for (const input of [
    { action: "reset", amount: "other", scope: "all", targets: [target] },
    {
      action: "reset",
      amount: "full",
      scope: "selected",
      targets: [target, target],
    },
    { action: "reset", amount: "full", scope: "all", targets: [] },
  ])
    assert.ok((await api.resetCredits(input)).error);
  assert.equal(api.calls.length, 0);
});
test("half/full resets use fixed reviewed amounts and configured actor, preserving target snapshots", async () => {
  for (const amount of ["half", "full"] as const) {
    const api = action();
    const result = await api.resetCredits({
      action: "reset",
      amount,
      scope: "selected",
      targets: [{ userId: member, cycle: null }],
    });
    assert.ok(result.success);
    assert.equal(api.calls[0].p_actor, "configured-owner");
    assert.equal(api.calls[0].p_amount, amount === "half" ? 500000 : 1000000);
    assert.equal(
      JSON.stringify(api.calls[0].p_targets),
      JSON.stringify([{ user_id: member, expected_cycle: null }]),
    );
  }
  const failed = action(true, true);
  const result = await failed.resetCredits({
    action: "reset",
    amount: "half",
    scope: "all",
    targets: [{ userId: member, cycle: null }],
  });
  assert.ok(result.error);
  assert.ok(!result.success);
});
