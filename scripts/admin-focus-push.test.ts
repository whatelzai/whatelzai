import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import { createHash } from "node:crypto";
import ts from "typescript";
import * as focus from "../lib/admin-focus";
import * as model from "../lib/admin-push/model";
import * as candidates from "../lib/admin-push/focus";
const requireNode = createRequire(import.meta.url);
function fixture(owner = true) {
  const subscription = {
    endpoint: "https://fcm.googleapis.com/fcm/send/test",
    keys: {
      p256dh: Buffer.alloc(65).toString("base64url"),
      auth: Buffer.alloc(16).toString("base64url"),
    },
  };
  const device = {
    id: "device",
    owner_id: "owner",
    endpoint_hash: createHash("sha256")
      .update(subscription.endpoint)
      .digest("hex"),
    encrypted_subscription: JSON.stringify(subscription),
    enabled: true,
    enabled_at: "2026-10-20T00:00:00Z",
    focus_updated_at: "2026-10-20T00:00:00Z",
    focus_settings: null as unknown,
    focus_hash: null as string | null,
  };
  let sourceReads = 0;
  const sent: Array<{ payload: string; options: { TTL: number } }> = [];
  const claims = new Set<string>();
  const db = {
    from(table: string) {
      if (table !== "users") sourceReads++;
      let update: Record<string, unknown> | null = null;
      const filters: Record<string, unknown> = {};
      let differentHash: string | undefined;
      const query = {
        select() {
          return query;
        },
        limit() {
          return query;
        },
        eq(key: string, value: unknown) {
          filters[key] = value;
          return query;
        },
        update(value: Record<string, unknown>) {
          update = value;
          return query;
        },
        or(value: string) {
          differentHash = value.split("focus_hash.neq.")[1];
          return query;
        },
        maybeSingle: async () => result(true),
        then(
          resolve: (value: unknown) => unknown,
          reject: (error: unknown) => unknown,
        ) {
          return Promise.resolve(result(false)).then(resolve, reject);
        },
      };
      function result(single: boolean) {
        if (table === "users")
          return {
            data: owner ? { id: "owner", role: "admin" } : null,
            error: null,
          };
        if (table === "admin_push_deliveries")
          return { data: null, error: null };
        if (table !== "admin_push_subscriptions")
          throw Error(`unexpected table ${table}`);
        const matches = Object.entries(filters).every(
          ([key, value]) => device[key as keyof typeof device] === value,
        );
        if (
          matches &&
          update &&
          (!differentHash || device.focus_hash !== differentHash)
        )
          Object.assign(device, update);
        return {
          data: single
            ? matches
              ? { ...device }
              : null
            : matches
              ? [{ ...device }]
              : [],
          error: null,
        };
      }
      return query;
    },
    async rpc(_name: string, args: { p_document: string }) {
      const claimed = !claims.has(args.p_document);
      claims.add(args.p_document);
      return { data: claimed, error: null };
    },
  };
  const mocks: Record<string, unknown> = {
    "server-only": {},
    "@/lib/admin-notifications/server": { recordAdminNotice: async () => {} },
    "@/lib/supabase-server": { supabaseAdmin: db },
    "@/lib/admin-focus": focus,
    "./focus": candidates,
    "./model": model,
    "@/lib/daily/crypto": {
      decryptSecret: (s: string) => s,
      encryptSecret: (s: string) => s,
    },
    "@/lib/admin-policy": { isOwnerUser: (user: unknown) => Boolean(user) },
    "@/lib/daily/connections": {
      emdeeConnection: async () => {
        throw Error("EMDEE must not be read");
      },
    },
    "@/lib/daily/emdee-client": {},
    "@/lib/daily/paths": {},
    "web-push": {
      sendNotification: async (
        _sub: unknown,
        payload: string,
        options: { TTL: number },
      ) => {
        sent.push({ payload, options });
      },
    },
  };
  const code = ts.transpileModule(
    readFileSync(
      new URL("../lib/admin-push/server.ts", import.meta.url),
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
  const testModule = { exports: {} };
  vm.runInNewContext(code, {
    module: testModule,
    exports: testModule.exports,
    require: (name: string) =>
      name in mocks ? mocks[name] : requireNode(name),
    process: {
      env: {
        WHATELZ_OWNER_USER_ID: "owner",
        ADMIN_PUSH_PUBLIC_KEY: "fixture",
        ADMIN_PUSH_PRIVATE_KEY: "fixture",
        DAILY_INTEGRATION_KEY: "fixture",
      },
    },
    Date,
    Buffer,
    console,
  });
  return {
    api: testModule.exports as typeof import("../lib/admin-push/server"),
    device,
    sent,
    claims,
    sourceReads: () => sourceReads,
    endpoint: subscription.endpoint,
  };
}
test("focus dispatch verifies sole owner before reading devices", async () => {
  const f = fixture(false);
  await assert.rejects(
    f.api.checkFocusPush(new Date("2026-10-23T00:00:00Z")),
    /owner_unavailable/,
  );
  assert.equal(f.sourceReads(), 0);
});
test("closed-app focus dispatch is independent of EMDEE and deduplicates concurrent repeats", async () => {
  const f = fixture();
  const now = new Date("2026-10-23T10:00:00Z");
  await Promise.all([f.api.checkFocusPush(now), f.api.checkFocusPush(now)]);
  assert.equal(f.sent.length, 1);
  const notice = JSON.parse(f.sent[0].payload);
  assert.equal(notice.title, "Time for Overview");
  assert.equal(notice.url, "/");
  assert.equal(f.sent[0].options.TTL, 60);
  assert(!f.sent[0].payload.includes("encrypted_subscription"));
});
test("pause and post-boundary opt-in suppress focus delivery", async () => {
  const f = fixture();
  f.device.focus_settings = { ...focus.DEFAULT_FOCUS, enabled: false };
  await f.api.checkFocusPush(new Date("2026-10-23T00:00:00Z"));
  assert.equal(f.sent.length, 0);
  f.device.focus_settings = null;
  f.device.focus_updated_at = "2026-10-23T00:00:01Z";
  await f.api.checkFocusPush(new Date("2026-10-23T00:01:00Z"));
  assert.equal(f.sent.length, 0);
});
test("unchanged timetable sync preserves its activation timestamp", async () => {
  const f = fixture();
  await f.api.savePushFocus("owner", f.endpoint, focus.DEFAULT_FOCUS);
  const original = f.device.focus_updated_at;
  assert.equal(f.device.focus_hash?.length, 64);
  await f.api.savePushFocus("owner", f.endpoint, focus.DEFAULT_FOCUS);
  assert.equal(f.device.focus_updated_at, original);
  await assert.rejects(
    f.api.savePushFocus("owner", f.endpoint, {} as focus.FocusSettings),
    /Invalid timetable/,
  );
});
