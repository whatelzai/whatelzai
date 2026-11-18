import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { randomUUID } from "node:crypto";
import { sendSchema, modelSchema, reserveCost } from "../lib/member-ai/model";
import { createReplyStream } from "../lib/member-ai/reply-stream";
import { roleSourceAllowed } from "../lib/weos-roles";
function load(
  options: {
    actual?: string;
    role?: string;
    preview?: boolean;
    owner?: boolean;
    denied?: boolean;
    fail?: boolean;
  } = {},
) {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const role = options.role ?? "torch";
  const query = (table: string) => {
    const q: Record<string, unknown> = {};
    for (const method of ["select", "eq", "order"])
      q[method] = (...args: unknown[]) => {
        calls.push({ name: table + "." + method, args: { values: args } });
        return q;
      };
    q.maybeSingle = async () => ({ data: { id: "conversation" }, error: null });
    q.limit = async () => ({
      data: [{ id: "message", role: "user", body: "test", proposals: [] }],
      error: null,
    });
    return q;
  };
  const db = {
    from: query,
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      if (name === "ensure_activated_member_ai")
        return { data: { active: true, model: "gpt-6.1-sol" } };
      if (name === "reserve_weos_preview")
        return options.denied
          ? { error: { message: "Role test conversation unavailable" } }
          : { data: { duplicate: false } };
      if (name === "weos_preview_context")
        return { data: { items: ["role-filtered reference"] } };
      return { data: null, error: null };
    },
  };
  let generated = 0;
  const mocks: Record<string, unknown> = {
    "next/server": { after: () => {} },
    "node:crypto": { randomUUID },
    "@/lib/weos-role-server": {
      weosAccess: async () => ({
        user: { id: "owner" },
        actual: options.actual ?? "beacon",
        role,
        preview: options.preview ?? true,
      }),
    },
    "@/lib/admin-policy": { isOwnerUser: () => options.owner ?? true },
    "@/lib/member-ai/http": {
      memberOriginAllowed: (r: Request) =>
        r.headers.get("origin") === "https://app.whatelz.ai",
    },
    "@/lib/member-ai/server": {
      memberApiEnabled: () => true,
      platformKey: async () => "synthetic-test-key",
    },
    "@/lib/member-ai/model": { sendSchema, modelSchema, reserveCost },
    "@/lib/supabase-server": { supabaseAdmin: db },
    "@/lib/supabase/auth-server": { createAuthClient: async () => db },
    "@/lib/fcos/resources": {
      readScopedResource: (
        input: { source: string; query: string },
        read: (s: string, q: string) => unknown,
      ) => read(input.source, input.query),
    },
    "@/lib/weos-roles": { roleSourceAllowed },
    "@/lib/member-ai/agent": {
      runMemberAgent: async (o: {
        role: string;
        readVault: (p: string) => Promise<unknown>;
        readCommitments: () => Promise<unknown>;
        readFcos: (i: unknown) => Promise<unknown>;
        onText: (t: string) => void;
        receipt: { charge: number };
      }) => {
        generated++;
        assert.equal(o.role, role);
        assert.equal(
          ((await o.readVault("private")) as { unavailable: boolean })
            .unavailable,
          true,
        );
        assert.equal(
          ((await o.readCommitments()) as { unavailable: boolean }).unavailable,
          true,
        );
        await o.readFcos({ source: "learning", query: "AI" });
        if (role === "ember")
          assert.equal(
            (
              (await o.readFcos({ source: "products", query: "" })) as {
                unavailable: boolean;
              }
            ).unavailable,
            true,
          );
        if (options.fail) throw Error("synthetic failure");
        o.receipt.charge = 3;
        o.onText("Hello");
        return { body: "Hello", proposals: [{ title: "Must not apply" }] };
      },
    },
    "@/lib/member-ai/reply-stream": { createReplyStream },
    "@/lib/daily/model": { singaporeDay: () => "2026-11-19" },
  };
  const code = ts.transpileModule(
    fs.readFileSync(
      new URL("../app/api/weos/preview/chat/route.ts", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(code, {
    module: loaded,
    exports: loaded.exports,
    require: (name: string) => {
      if (!(name in mocks)) throw Error("Unexpected import " + name);
      return mocks[name];
    },
    Response,
    Buffer,
  });
  return {
    post: (loaded.exports as { POST: (r: Request) => Promise<Response> }).POST,
    calls,
    generated: () => generated,
  };
}
const payload = () => ({
  requestId: randomUUID(),
  conversationId: randomUUID(),
  text: "Test this role",
});
const request = (body: unknown, origin = "https://app.whatelz.ai") =>
  new Request("https://app.whatelz.ai/api/weos/preview/chat", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
test("role testing requires configured Beacon, active preview and same origin before spending", async () => {
  for (const options of [
    { owner: false },
    { actual: "torch" },
    { preview: false },
  ]) {
    const m = load(options);
    assert.equal((await m.post(request(payload()))).status, 403);
    assert.equal(m.calls.length, 0);
    assert.equal(m.generated(), 0);
  }
  const m = load();
  assert.equal(
    (await m.post(request(payload(), "https://evil.example"))).status,
    403,
  );
  assert.equal(m.calls.length, 0);
});
test("client cannot select a different role, identity, history or image in the test request", async () => {
  const m = load();
  for (const extra of [
    { role: "beacon" },
    { userId: "other" },
    { history: [] },
    { imageIds: [randomUUID()] },
  ])
    assert.equal(
      (await m.post(request({ ...payload(), ...extra }))).status,
      400,
    );
  assert.equal(m.calls.length, 0);
});
test("database rejects normal or cross-role conversation before any model call", async () => {
  const m = load({ denied: true });
  assert.equal((await m.post(request(payload()))).status, 409);
  assert.equal(m.generated(), 0);
});
test("streamed tests use the selected SQL role, isolate history and settle normal allowance without actionable proposals", async () => {
  for (const role of ["torch", "ember", "blaze"]) {
    const m = load({ role });
    const response = await m.post(request(payload()));
    assert.equal(response.status, 200);
    const stream = await response.text();
    assert.match(stream, /"type":"delta","text":"Hello"/);
    assert.match(stream, /"type":"done"/);
    assert.equal(m.generated(), 1);
    assert.equal(
      m.calls.find((c) => c.name === "reserve_weos_preview")?.args.p_role,
      role,
    );
    assert.equal(
      m.calls.find((c) => c.name === "weos_preview_context")?.args.p_role,
      role,
    );
    assert.ok(
      m.calls.some(
        (c) =>
          c.name === "member_ai_conversations.eq" &&
          JSON.stringify(c.args.values) ===
            JSON.stringify(["preview_role", role]),
      ),
    );
    const settled = m.calls.find((c) => c.name === "finish_member_ai")!.args;
    assert.equal(settled.p_charge, 3);
    assert.equal(JSON.stringify(settled.p_proposals), "[]");
  }
});
test("failed tests settle failure instead of leaving an unaccounted successful reply", async () => {
  const m = load({ fail: true });
  const response = await m.post(request(payload()));
  assert.match(await response.text(), /"type":"error"/);
  assert.equal(
    m.calls.find((c) => c.name === "finish_member_ai")?.args.p_failed,
    true,
  );
});
