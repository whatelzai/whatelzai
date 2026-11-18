import assert from "node:assert/strict";
import { test } from "node:test";
import { adminChatPlan, taskProposal } from "../lib/admin-chat/planner";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";
import { adminChatOriginAllowed } from "../lib/admin-chat/model";
test("planner confines generation to requested model and structured proposal, without provider storage or tools", async () => {
  let body = {} as {
    store: boolean;
    model: string;
    tools?: unknown;
    text: { format: { strict: boolean } };
    instructions: string;
  };
  const mock: typeof fetch = async (_u, init) => {
    body = JSON.parse(String(init?.body));
    return Response.json({
      model: "gpt-6.1-sol",
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: JSON.stringify({ reply: "Ready", proposal: null }),
            },
          ],
        },
      ],
    });
  };
  assert.deepEqual(
    await adminChatPlan(
      "fixture",
      [{ role: "user", content: "Hello" }],
      "verified tasks",
      mock,
    ),
    { reply: "Ready", proposal: null },
  );
  assert.equal(body.store, false);
  assert.equal(body.model, "gpt-6.1-sol");
  assert.equal(body.tools, undefined);
  assert.equal(body.text.format.strict, true);
  assert.match(body.instructions, /cannot perform writes/);
  await assert.rejects(
    adminChatPlan("fixture", [], "", async () =>
      Response.json({ model: "other", output: [] }),
    ),
  );
  await assert.rejects(
    adminChatPlan("fixture", [], "", async () =>
      Response.json({
        output: [
          { type: "message", content: [{ type: "refusal", refusal: "No" }] },
        ],
      }),
    ),
  );
  assert.equal(
    taskProposal.safeParse({
      operation: "update",
      id: null,
      revision: null,
      title: "Test",
      lane: "personal",
      due_on: "2026-11-18",
      status: "open",
      reason: "",
    }).success,
    false,
  );
});
function route(path: string, owner = true) {
  const calls: { name: string; args: unknown }[] = [];
  const out = {
    exports: {} as Record<string, (r: Request) => Promise<Response>>,
  };
  vm.runInNewContext(
    ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      exports: out.exports,
      Request,
      Response,
      URL,
      Buffer,
      Date,
      process: { env: { NODE_ENV: "production" } },
      require: (n: string) =>
        n === "zod"
          ? { z }
          : n === "@/lib/daily/server"
            ? {
                dailyOwner: async () => {
                  if (!owner) throw Error();
                  return "verified-owner";
                },
              }
            : n === "@/lib/admin-chat/model"
              ? { adminChatOriginAllowed }
              : n === "next/cache"
                ? { revalidatePath: () => {} }
                : n === "@/lib/supabase-server"
                  ? {
                      supabaseAdmin: {
                        rpc: async (name: string, args: unknown) => {
                          calls.push({ name, args });
                          return { data: "task-id", error: null };
                        },
                        from: () => {
                          throw Error("Unexpected storage read");
                        },
                      },
                    }
                  : {},
    },
  );
  return { api: out.exports, calls };
}
const request = (body: unknown, origin = "https://admin.whatelz.ai") =>
  new Request("https://admin.whatelz.ai/api/admin/chat/tasks", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
test("task confirmation derives owner server-side and accepts only a stored turn ID", async () => {
  const { api, calls } = route("app/api/admin/chat/tasks/route.ts");
  const id = "00000000-0000-4000-8000-000000000001";
  assert.equal(
    (
      await api.POST(
        request({ turn_id: id, owner: "attacker", title: "injected" }),
      )
    ).status,
    400,
  );
  assert.equal(
    (await api.POST(request({ turn_id: id }, "https://evil.example"))).status,
    403,
  );
  assert.equal((await api.POST(request({ turn_id: id }))).status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    {
      name: "apply_admin_chat_proposal",
      args: { p_owner: "verified-owner", p_turn: id },
    },
  ]);
  assert.equal(
    (
      await route("app/api/admin/chat/tasks/route.ts", false).api.POST(
        request({ turn_id: id }),
      )
    ).status,
    403,
  );
});
test("notification reads and writes reject a nonowner before storage access", async () => {
  const { api } = route("app/api/admin/notifications/route.ts", false);
  assert.equal((await api.GET(request({}))).status, 403);
  assert.equal((await api.PATCH(request({ action: "read-all" }))).status, 403);
});
