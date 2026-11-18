import assert from "node:assert/strict";
import { test } from "node:test";
import {
  latestRhythmKeys,
  notesBody,
  rhythmPath,
  rhythmNotice,
  type RhythmSnapshot,
} from "../lib/admin-rhythm/model";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";
import { rhythmKinds } from "../lib/admin-rhythm/model";
import { adminChatOriginAllowed } from "../lib/admin-chat/model";
test("latest selection uses canonical hub relationships, dates across years and ignores future daily drafts and prose mentions", () => {
  const hub =
    "## Parent of\n* [[Morning — 2026-01-01]]\n* [[Morning — 2025-12-31]]\n* [[Morning — 2026-01-03]]\n## Notes\n[[Morning — 2026-01-04]]";
  assert.deepEqual(latestRhythmKeys(hub, "morning", "2026-01-02"), [
    "2026-01-01",
    "2025-12-31",
  ]);
  assert.deepEqual(
    latestRhythmKeys(
      "## Parent of\n* [[WEEK-2026-W01]]\n* [[WEEK-2025-W52]]\n## Notes",
      "weekly",
      "2026-01-01",
    ),
    ["2026-W01", "2025-W52"],
  );
  assert.equal(
    rhythmPath("evening", "2026-01-01"),
    "edmund/01-personal/01-daily/02-evening/2026-01-01-EVENING.md",
  );
  assert.equal(
    notesBody("## Notes\n### One\nactual\n## Other\nignore"),
    "### One\nactual",
  );
});
test("notification identity changes only with a saved source version, without exposing private prose", () => {
  const snapshot = {
    kind: "morning",
    entry_key: "2026-01-01",
    version: "a".repeat(64),
    body: "private context",
  } as RhythmSnapshot;
  assert.deepEqual(rhythmNotice(snapshot), rhythmNotice({ ...snapshot }));
  assert.notEqual(
    rhythmNotice(snapshot).tag,
    rhythmNotice({ ...snapshot, version: "b".repeat(64) }).tag,
  );
  assert.ok(
    !JSON.stringify(rhythmNotice(snapshot)).includes("private context"),
  );
});
function api(allowed = true) {
  const calls: unknown[][] = [],
    out = {
      exports: {} as {
        GET: () => Promise<Response>;
        POST: (r: Request) => Promise<Response>;
      },
    };
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync("app/api/admin/rhythm/route.ts", "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
    {
      exports: out.exports,
      Response,
      process: { env: { NODE_ENV: "production" } },
      require: (n: string) =>
        n === "zod"
          ? { z }
          : n === "@/lib/daily/server"
            ? {
                dailyOwner: async () => {
                  if (!allowed) throw Error();
                  return "owner";
                },
              }
            : n === "@/lib/admin-chat/model"
              ? { adminChatOriginAllowed }
              : n === "@/lib/admin-rhythm/model"
                ? { rhythmKinds }
                : n === "@/lib/admin-rhythm/server"
                  ? {
                      cachedRhythms: async () => {
                        calls.push(["read"]);
                        return [
                          {
                            kind: "morning",
                            entry_key: "2026-01-01",
                            version: "a".repeat(64),
                            read_version: null,
                            body: "private body",
                            document_path: "private path",
                          },
                        ];
                      },
                      markRhythmRead: async (...args: unknown[]) =>
                        calls.push(args),
                    }
                  : {},
    },
  );
  return { api: out.exports, calls };
}
const req = (body: unknown, origin = "https://admin.whatelz.ai") =>
  new Request("https://admin.whatelz.ai/api/admin/rhythm", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
test("read receipt requires same origin and verified owner, pins exact version and sends no document content in status response", async () => {
  const denied = api(false);
  assert.equal((await denied.api.GET()).status, 403);
  assert.equal(denied.calls.length, 0);
  const h = api();
  assert.equal(
    (
      await h.api.POST(
        req({ kind: "morning", version: "a".repeat(64) }, "https://evil.test"),
      )
    ).status,
    403,
  );
  assert.equal(h.calls.length, 0);
  assert.equal(
    (
      await h.api.POST(
        req({ kind: "morning", version: "a".repeat(64), owner: "other" }),
      )
    ).status,
    400,
  );
  assert.equal(
    (await h.api.POST(req({ kind: "morning", version: "a".repeat(64) })))
      .status,
    200,
  );
  assert.deepEqual(h.calls, [["owner", "morning", "a".repeat(64)]]);
  const body = await (await h.api.GET()).text();
  assert.ok(!body.includes("private body"));
  assert.ok(!body.includes("private path"));
});

test("routine sync runs without push opt-in, and new versions notify an opted-in device once", async () => {
  const { createRequire } = await import("node:module");
  const requireNode = createRequire(import.meta.url);
  const model = await import("../lib/admin-push/model");
  const focus = await import("../lib/admin-focus");
  const focusModel = await import("../lib/admin-push/focus");
  let enabled = false,
    syncs = 0,
    sends = 0;
  const deliveries = new Map<string, string>();
  const snapshot = {
    kind: "morning",
    entry_key: "2026-11-19",
    version: "a".repeat(64),
    source_updated_at: new Date(Date.now() - 1000).toISOString(),
    document_path: "canonical-source",
    body: "### Morning brief\n\n" + "Actual source evidence. ".repeat(10),
  } as RhythmSnapshot;
  const device = {
    id: "device",
    owner_id: "owner",
    enabled: true,
    enabled_at: new Date(Date.now() - 3600000).toISOString(),
    encrypted_subscription: JSON.stringify({
      endpoint: "https://fcm.googleapis.com/fcm/send/fixture",
      keys: {
        p256dh: Buffer.alloc(65).toString("base64url"),
        auth: Buffer.alloc(16).toString("base64url"),
      },
    }),
  };
  const db = {
    from(table: string) {
      const filters: Record<string, string> = {};
      let update: Record<string, string> | null = null;
      const q = {
        select: () => q,
        eq: (k: string, v: string) => {
          filters[k] = v;
          return q;
        },
        limit: () => q,
        update: (v: Record<string, string>) => {
          update = v;
          return q;
        },
        upsert: () => q,
        maybeSingle: async () => result(true),
        then: (
          resolve: (v: unknown) => unknown,
          reject: (e: unknown) => unknown,
        ) => Promise.resolve(result(false)).then(resolve, reject),
      };
      function result(single: boolean) {
        if (table === "users")
          return { data: { id: "owner", role: "admin" }, error: null };
        if (table === "admin_push_subscriptions")
          return {
            data: single ? { enabled } : enabled ? [device] : [],
            error: null,
          };
        if (table === "admin_push_deliveries") {
          if (update) deliveries.set(filters.document_path, update.status);
          return { data: null, error: null };
        }
        return { data: null, error: null };
      }
      return q;
    },
    rpc: async (_name: string, args: { p_document: string }) => {
      if (deliveries.has(args.p_document)) return { data: false, error: null };
      deliveries.set(args.p_document, "sending");
      return { data: true, error: null };
    },
  };
  const mocks: Record<string, unknown> = {
    "server-only": {},
    "@/lib/supabase-server": { supabaseAdmin: db },
    "@/lib/admin-rhythm/server": {
      syncRhythms: async () => {
        syncs++;
      },
      cachedRhythms: async () => [snapshot],
    },
    "@/lib/admin-rhythm/model": { rhythmNotice },
    "@/lib/admin-notifications/server": { recordAdminNotice: async () => {} },
    "@/lib/admin-focus": focus,
    "./focus": focusModel,
    "./model": model,
    "@/lib/daily/crypto": { decryptSecret: (v: string) => v },
    "@/lib/admin-policy": { isOwnerUser: () => true },
    "web-push": {
      sendNotification: async () => {
        sends++;
      },
    },
  };
  const out = {
    exports: {} as {
      checkRoutinePush: () => Promise<{ devices: number; sent: number }>;
    },
  };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync("lib/admin-push/server.ts", "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    {
      exports: out.exports,
      require: (n: string) => (n in mocks ? mocks[n] : requireNode(n)),
      process: {
        env: {
          WHATELZ_OWNER_USER_ID: "owner",
          ADMIN_PUSH_PUBLIC_KEY: "fixture",
          ADMIN_PUSH_PRIVATE_KEY: "fixture",
          DAILY_INTEGRATION_KEY: "fixture",
        },
      },
      Buffer,
      Date,
      console,
    },
  );
  assert.equal((await out.exports.checkRoutinePush()).devices, 0);
  assert.equal(syncs, 1);
  assert.equal(sends, 0);
  enabled = true;
  assert.equal((await out.exports.checkRoutinePush()).sent, 1);
  assert.equal((await out.exports.checkRoutinePush()).sent, 0);
  assert.equal(sends, 1);
  snapshot.version = "b".repeat(64);
  assert.equal((await out.exports.checkRoutinePush()).sent, 1);
  assert.equal(sends, 2);
});
