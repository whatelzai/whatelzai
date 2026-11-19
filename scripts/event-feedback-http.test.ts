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
    "@/lib/event-return-offer/server": {
      issueReturnOffer: async () => null,
      returnCookieHeader: () => "",
    },
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
test("email check returns only a match for the entered address and fixed event", async () => {
  for (const matched of [false, true]) {
    const api = loadRoute(
      "app/api/event-feedback/check-email/route.ts",
      {},
      {
        "@/lib/event-feedback/server": {
          openFeedbackEvent: async (id: string) => {
            assert.equal(id, event.id);
            return event;
          },
          matchesEventRegistration: async (key: string, email: string) => {
            assert.equal(key, event.key);
            assert.equal(email, "attendee@example.test");
            return matched;
          },
        },
      },
    );
    const r = await api.POST(
      req({ eventId: event.id, email: " Attendee@Example.test " }),
    );
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(await r.json(), { matched });
    assert.equal(api.GET, undefined);
  }
});
test("submission rechecks registration inside the database and rejects missing email or forged approval", async () => {
  let writes = 0,
    rejectRegistration = false;
  const api = loadRoute("app/api/event-feedback/route.ts", {
    rpc: async (name: string, args: Record<string, unknown>) => {
      writes++;
      assert.equal(name, "submit_registered_event_feedback");
      assert.equal(args.p_event, event.recordId);
      assert.equal(args.p_email, "attendee@example.test");
      assert.equal(args.p_form, config.id);
      assert.equal("p_verification" in args, false);
      return {
        error: rejectRegistration
          ? { message: "FEEDBACK_REGISTRATION_REQUIRED" }
          : null,
      };
    },
  });
  const input = {
    eventId: event.id,
    email: "Attendee@Example.test",
    requestId: crypto.randomUUID(),
    formId: config.id,
    answers: Object.fromEntries(
      config.questions.map((q) => [
        q.id,
        q.type === "rating" ? 4 : q.type === "text" ? "" : false,
      ]),
    ),
  };
  assert.equal(
    (await api.POST(req({ ...input, email: undefined }))).status,
    400,
  );
  assert.equal((await api.POST(req({ ...input, matched: true }))).status, 400);
  assert.equal(
    (await api.POST(req({ ...input, answers: { format: true } }))).status,
    400,
  );
  assert.equal(
    (await api.POST(req({ ...input, formId: "feedback-earlier-version" })))
      .status,
    409,
  );
  assert.equal(writes, 0);
  assert.equal((await api.POST(req(input))).status, 200);
  rejectRegistration = true;
  assert.equal((await api.POST(req(input))).status, 403);
});
test("retired code endpoints never issue or verify a code", async () => {
  for (const name of ["request-code", "verify-code"]) {
    const api = loadRoute(`app/api/event-feedback/${name}/route.ts`, {});
    assert.equal((await api.POST(req({}))).status, 410);
  }
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
