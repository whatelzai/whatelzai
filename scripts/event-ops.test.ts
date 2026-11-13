import test from "node:test";
import assert from "node:assert/strict";
import { manualCheckin } from "../lib/event-admin/manual-checkin";
import {
  mediaInput,
  EVENT_MEDIA_MAX_BYTES,
  eventMediaAdminHost,
} from "../lib/event-admin/media-policy";
const person = {
  name: "Test attendee",
  ticket: "00000000-0000-4000-8000-000000000001",
  status: "confirmed",
  checkedIn: null,
};
test("manual check-in requires named confirmation; cancel never sends a request", async () => {
  let calls = 0;
  const request = (async () => {
    calls++;
    throw Error("Unexpected request");
  }) as typeof fetch;
  assert.equal(
    await manualCheckin(
      person,
      (message) => {
        assert.match(message, /Check in Test attendee\?/);
        return false;
      },
      request,
    ),
    null,
  );
  assert.equal(calls, 0);
});
test("pending, cancelled, checked-in or missing tickets never prompt or submit", async () => {
  for (const p of [
    { ...person, status: "pending" },
    { ...person, status: "cancelled" },
    { ...person, checkedIn: "saved" },
    { ...person, ticket: null },
  ])
    assert.equal(
      await manualCheckin(p, () => {
        throw Error("Unexpected prompt");
      }),
      null,
    );
});
test("manual check-in submits exact ticket and handles a concurrent QR check-in idempotently", async () => {
  const receipt = {
    status: "already_checked_in",
    name: person.name,
    at: "2026-11-13T00:00:00Z",
  };
  const result = await manualCheckin(person, () => true, (async (
    url,
    options,
  ) => {
    assert.equal(url, "/api/event-checkin");
    assert.equal(JSON.parse(options!.body as string).ticket, person.ticket);
    return Response.json(receipt);
  }) as typeof fetch);
  assert.deepEqual(result, receipt);
});
test("server rejection does not become manual check-in success", async () => {
  await assert.rejects(
    () =>
      manualCheckin(person, () => true, (async () =>
        Response.json(
          { error: "Ticket invalid or cancelled" },
          { status: 404 },
        )) as typeof fetch),
    /invalid or cancelled/,
  );
});
test("media policy rejects oversized, executable and malformed uploads; names cannot traverse paths", () => {
  for (const file of [
    { name: "x.svg", type: "image/svg+xml", size: 1 },
    { name: "x.mp4", type: "video/mp4", size: EVENT_MEDIA_MAX_BYTES + 1 },
    { name: "", type: "image/png", size: 1 },
    { name: "x", type: "image/png", size: -1 },
    null,
  ])
    assert.throws(() => mediaInput(file));
  const f = mediaInput({
    name: "../../event photo.png",
    type: "image/png",
    size: 10,
  });
  assert.ok(!f.name.includes("/"));
  assert.equal(f.size, 10);
});
test("media API is restricted to Admin host", () => {
  assert.equal(
    eventMediaAdminHost(
      new Request("https://admin.whatelz.ai/api/admin/event-media"),
    ),
    true,
  );
  for (const host of [
    "whatelz.ai",
    "app.whatelz.ai",
    "admin.whatelz.ai.evil.test",
  ])
    assert.equal(
      eventMediaAdminHost(new Request(`https://${host}/api/admin/event-media`)),
      false,
    );
});

import { readFileSync } from "node:fs";
import ts from "typescript";
import vm from "node:vm";
import * as policy from "../lib/event-admin/media-policy";
test("media endpoints reject wrong host, origin and non-owner before storage access", async () => {
  let reads = 0,
    authCalls = 0;
  const mod = {
    exports: {} as {
      GET: (r: Request) => Promise<Response>;
      POST: (r: Request) => Promise<Response>;
    },
  };
  const code = ts.transpileModule(
    readFileSync(
      new URL("../app/api/admin/event-media/route.ts", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    module: mod,
    exports: mod.exports,
    Response,
    URL,
    Number,
    JSON,
    require: (name: string) =>
      ({
        "node:crypto": { randomUUID: () => "id" },
        "@/lib/daily/server": {
          dailyOwner: async () => {
            authCalls++;
            throw Error("Forbidden");
          },
        },
        "@/lib/supabase-server": {
          supabaseAdmin: {
            storage: {
              from: () => {
                reads++;
                throw Error("Unexpected storage access");
              },
            },
          },
        },
        "@/lib/event-tickets": { EVENT_KEY: "event" },
        "@/lib/event-admin/media-policy": policy,
      })[name],
  });
  assert.equal(
    (
      await mod.exports.GET(
        new Request("https://app.whatelz.ai/api/admin/event-media"),
      )
    ).status,
    403,
  );
  assert.equal(authCalls, 0);
  const denied = await mod.exports.GET(
    new Request("https://admin.whatelz.ai/api/admin/event-media"),
  );
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get("cache-control"), "private, no-store");
  const before = authCalls;
  assert.equal(
    (
      await mod.exports.POST(
        new Request("https://admin.whatelz.ai/api/admin/event-media", {
          method: "POST",
          headers: { origin: "https://evil.test" },
          body: "{}",
        }),
      )
    ).status,
    403,
  );
  assert.equal(authCalls, before);
  assert.equal(reads, 0);
});
