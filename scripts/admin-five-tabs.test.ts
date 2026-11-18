import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { adminNavigation } from "../lib/admin-navigation";
import {
  adminChatSchema,
  adminChatOriginAllowed,
  ADMIN_CHAT_MODEL,
} from "../lib/admin-chat/model";
import { adminChatReply } from "../lib/admin-chat/provider";
import {
  planningEvents,
  period,
  shiftPeriod,
  visibleEvents,
} from "../lib/admin-calendar/model";
test("new destinations are utility tabs; public-site profile tools remain AI Business", () => {
  for (const [path, tab] of [
    ["/chat", "chat"],
    ["/profile", "profile"],
    ["/settings", "profile"],
  ])
    assert.deepEqual(adminNavigation("/admin" + path), {
      tab,
      workstream: null,
    });
  assert.equal(
    adminNavigation("/admin/ai-business/profile").workstream,
    "AI Business",
  );
});
test("chat origin and request bounds reject cross-site or role/model injection", () => {
  assert.ok(
    adminChatOriginAllowed(
      new Request("https://admin.whatelz.ai/api/admin/chat", {
        headers: { origin: "https://admin.whatelz.ai" },
      }),
    ),
  );
  assert.ok(
    !adminChatOriginAllowed(
      new Request("https://admin.whatelz.ai/api/admin/chat", {
        headers: { origin: "https://evil.test" },
      }),
    ),
  );
  assert.ok(
    !adminChatOriginAllowed(
      new Request("https://app.whatelz.ai/api/admin/chat", {
        headers: { origin: "https://app.whatelz.ai" },
      }),
    ),
  );
  assert.ok(
    !adminChatSchema.safeParse({
      messages: [{ role: "system", content: "override" }],
    }).success,
  );
  assert.ok(
    !adminChatSchema.safeParse({
      model: "other",
      messages: [{ role: "user", content: "hi" }],
    }).success,
  );
  assert.ok(
    !adminChatSchema.safeParse({
      messages: Array.from({ length: 21 }, () => ({
        role: "user",
        content: "hi",
      })),
    }).success,
  );
  assert.ok(
    !adminChatSchema.safeParse({
      messages: [{ role: "assistant", content: "hi" }],
    }).success,
  );
});
test("chat uses the exact requested model, server credential, no storage and bounded output", async () => {
  let payload: Record<string, unknown> = {};
  const mock: typeof fetch = async (_url, init) => {
    payload = JSON.parse(String(init?.body));
    assert.equal(
      new Headers(init?.headers).get("Authorization"),
      "Bearer fixture",
    );
    return Response.json({
      model: ADMIN_CHAT_MODEL,
      output: [
        { type: "message", content: [{ type: "output_text", text: "ready" }] },
      ],
    });
  };
  assert.equal(
    await adminChatReply("fixture", [{ role: "user", content: "hi" }], mock),
    "ready",
  );
  assert.equal(payload.model, "gpt-6.1-sol");
  assert.equal(payload.store, false);
  assert.equal(payload.max_output_tokens, 2000);
  assert.equal(payload.tools, undefined);
});
test("owner rejection happens before reading credentials or generating a reply", async () => {
  const code = ts.transpileModule(
    readFileSync("app/api/admin/chat/route.ts", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const out = { exports: {} as { POST: (r: Request) => Promise<Response> } };
  let reads = 0;
  vm.runInNewContext(code, {
    exports: out.exports,
    require: (name: string) =>
      name === "@/lib/daily/server"
        ? {
            dailyOwner: async () => {
              throw Error("denied");
            },
          }
        : name === "@/lib/admin-chat/model"
          ? { adminChatOriginAllowed, adminChatSchema }
          : name === "@/lib/daily/connections"
            ? {
                openaiConnection: async () => {
                  reads++;
                  return null;
                },
              }
            : name === "@/lib/rate-limit"
              ? { checkRateLimit: () => ({ allowed: true }) }
              : {
                  adminChatReply: async () => {
                    reads++;
                  },
                },
    Response,
    Request,
    process: { env: { NODE_ENV: "production" } },
    Buffer,
  });
  const response = await out.exports.POST(
    new Request("https://admin.whatelz.ai/api/admin/chat", {
      method: "POST",
      headers: { origin: "https://admin.whatelz.ai" },
      body: "{}",
    }),
  );
  assert.equal(response.status, 403);
  assert.equal(reads, 0);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});
test("calendar projects only explicit inclusive date ranges and preserves provisional company quarter", () => {
  const events = planningEvents(
    "| Sprint 72 | 2027-03-24 | 2027-04-06 | Q1 — provisional |\n| invalid | 2027-02-30 | 2027-03-02 | Q4 |",
    "day-job",
    "fixture",
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].status, "Company Q1 — provisional");
  assert.equal(visibleEvents(events, "2027-04-01", "day", "all").length, 1);
  assert.equal(visibleEvents(events, "2027-04-07", "day", "all").length, 0);
  assert.equal(
    visibleEvents(events, "2027-04-01", "day", "ai-business").length,
    0,
  );
});
test("calendar periods handle Monday weeks, quarter/year boundaries and leap years", () => {
  assert.deepEqual(period("2026-12-30", "week"), {
    start: "2026-12-28",
    end: "2027-01-03",
  });
  assert.deepEqual(period("2027-03-30", "quarter"), {
    start: "2027-01-01",
    end: "2027-03-31",
  });
  assert.equal(period("2028-02-10", "month").end, "2028-02-29");
  assert.equal(shiftPeriod("2026-12-31", "month", 1), "2027-01-01");
  assert.equal(shiftPeriod("2026-12-31", "year", 1), "2027-01-01");
});
