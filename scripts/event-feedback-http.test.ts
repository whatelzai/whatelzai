import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as crypto from "node:crypto";
import * as schemas from "../lib/event-feedback/questions";
const config = schemas.feedbackFormConfig.parse(
  JSON.parse(
    readFileSync("content/event-feedback/feedback-v3-20261118.json", "utf8"),
  ),
);
const event = {
  recordId: "d61b02e0-76c3-422c-b65d-e9ec570d7ff2",
  id: "ELZ-EVT-0004",
  key: "nov12",
  title: "Example session",
  dateLabel: "12 November 2026",
};
const hash = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");
const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
function loadRoute(
  file: string,
  db: unknown,
  over: Record<string, unknown> = {},
) {
  const mod = {
    exports: {} as { POST: (r: Request) => Promise<Response>; GET?: unknown },
  };
  const code = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const defaults: Record<string, unknown> = {
    "node:crypto": crypto,
    "next/server": { after: () => {} },
    "@/lib/event-feedback/questions": schemas,
    "@/lib/event-feedback/http": {
      feedbackBody: async (r: Request) => ({ body: await r.json() }),
      feedbackJson: json,
    },
    "@/lib/event-feedback/server": {
      feedbackHash: hash,
      openFeedbackEvent: async () => event,
      loadFeedbackForm: async () => config,
      sendFeedbackCode: async () => {},
    },
    "@/lib/supabase-server": { supabaseAdmin: db },
    "@/lib/rate-limit": { getClientIp: () => "127.0.0.1" },
  };
  vm.runInNewContext(code, {
    exports: mod.exports,
    module: mod,
    require: (name: string) => {
      if (!(name in { ...defaults, ...over })) throw Error(name);
      return { ...defaults, ...over }[name];
    },
    Response,
    Request,
    URL,
    console,
    process: {
      env: {
        RESEND_API_KEY: "synthetic",
        EVENT_CONFIRMATION_FROM: "tickets@example.test",
      },
    },
  });
  return mod.exports;
}
const req = (body: unknown) =>
  new Request("https://whatelz.ai/api/event-feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://whatelz.ai",
    },
    body: JSON.stringify(body),
  });
test("code request has the same non-enumerating response for unknown and registered emails and queues only the registered recipient", async () => {
  const responses: unknown[] = [],
    sent: unknown[][] = [];
  for (const registered of [false, true]) {
    const deferred: Array<() => Promise<void>> = [];
    const query = {
      select() {
        return this;
      },
      eq() {
        return this;
      },
      order() {
        return this;
      },
      async limit() {
        return {
          data: registered
            ? [{ id: "registration", email: "attendee@example.test" }]
            : [],
          error: null,
        };
      },
    };
    const api = loadRoute(
      "app/api/event-feedback/request-code/route.ts",
      {
        from: () => query,
        rpc: async (_name: string, args: Record<string, unknown>) => {
          assert.equal(args.p_registration, registered ? "registration" : null);
          return { error: null };
        },
      },
      {
        "next/server": {
          after: (fn: () => Promise<void>) => deferred.push(fn),
        },
        "@/lib/event-feedback/server": {
          feedbackHash: hash,
          openFeedbackEvent: async () => event,
          sendFeedbackCode: async (...args: unknown[]) => {
            sent.push(args);
          },
        },
      },
    );
    const response = await api.POST(
      req({ eventId: event.id, email: "attendee@example.test" }),
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const body = await response.json();
    assert.match(body.verificationId, /^[a-f0-9-]{36}$/);
    delete body.verificationId;
    responses.push(body);
    assert.equal(deferred.length, registered ? 1 : 0);
    for (const f of deferred) await f();
    assert.equal(api.GET, undefined);
  }
  assert.deepEqual(responses[0], responses[1]);
  assert.equal(sent.length, 1);
  assert.equal(sent[0][0], "attendee@example.test");
  assert.match(String(sent[0][1]), /^\d{6}$/);
  assert.equal(
    JSON.stringify(responses).includes("attendee@example.test"),
    false,
  );
});
test("submission requires proof and the complete pinned configuration, not caller-supplied questions", async () => {
  let writes = 0;
  let rejectProof = false;
  const api = loadRoute("app/api/event-feedback/route.ts", {
    rpc: async (name: string, args: Record<string, unknown>) => {
      writes++;
      assert.equal(name, "submit_verified_event_feedback");
      assert.equal(args.p_event, event.recordId);
      assert.equal(args.p_form, config.id);
      assert.equal("p_email" in args, false);
      return {
        error: rejectProof
          ? { message: "FEEDBACK_VERIFICATION_REQUIRED" }
          : null,
      };
    },
  });
  const input = {
    eventId: event.id,
    requestId: crypto.randomUUID(),
    verificationId: crypto.randomUUID(),
    token: "a".repeat(64),
    formId: config.id,
    answers: Object.fromEntries(
      config.questions.map((q) => [
        q.id,
        q.type === "rating" ? 4 : q.type === "text" ? "" : false,
      ]),
    ),
  };
  assert.equal(
    (await api.POST(req({ ...input, token: undefined }))).status,
    400,
  );
  assert.equal(
    (await api.POST(req({ ...input, answers: { format: true } }))).status,
    400,
  );
  assert.equal((await api.POST(req({ ...input, questions: [] }))).status, 400);
  assert.equal(writes, 0);
  assert.equal((await api.POST(req(input))).status, 200);
  rejectProof = true;
  assert.equal((await api.POST(req(input))).status, 401);
});
test("bad verification code never yields a proof token", async () => {
  let valid = false;
  const api = loadRoute("app/api/event-feedback/verify-code/route.ts", {
    rpc: async () => ({ data: valid, error: null }),
  });
  const input = {
    eventId: event.id,
    verificationId: crypto.randomUUID(),
    code: "123456",
  };
  const bad = await api.POST(req(input));
  assert.equal(bad.status, 400);
  assert.equal("token" in (await bad.json()), false);
  valid = true;
  const ok = await api.POST(req(input));
  assert.equal(ok.status, 200);
  assert.match((await ok.json()).token, /^[a-f0-9]{64}$/);
});

test("feedback transport keeps comments beyond the old 8k cap while small verification requests stay bounded", async () => {
  const { feedbackBody } = await import("../lib/event-feedback/http");
  const body = { comment: "A".repeat(20000) };
  const long = await feedbackBody(req(body), true);
  assert.ok("body" in long);
  if ("body" in long)
    assert.equal((long.body as { comment: string }).comment.length, 20000);
  const small = await feedbackBody(req(body));
  assert.ok("response" in small);
  if ("response" in small) assert.equal(small.response.status, 413);
  const hostile = new Request("https://whatelz.ai/api/event-feedback", {
    method: "POST",
    headers: {
      Origin: "https://other.example",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const rejected = await feedbackBody(hostile, true);
  assert.ok("response" in rejected);
  if ("response" in rejected) assert.equal(rejected.response.status, 403);
});
