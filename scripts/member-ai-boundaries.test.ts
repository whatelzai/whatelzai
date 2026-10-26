import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import * as model from "../lib/member-ai/model";
import { createReplyStream } from "../lib/member-ai/reply-stream";
import { readReply } from "../lib/member-ai/stream";
import * as profileUsage from "../lib/profile/usage";
const requireNode = createRequire(import.meta.url);
function load<T>(
  file: string,
  mocks: Record<string, unknown>,
  extra: Record<string, unknown> = {},
) {
  const code = ts.transpileModule(
    readFileSync(new URL(`../${file}`, import.meta.url), "utf8"),
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
      name === "server-only"
        ? {}
        : name in mocks
          ? mocks[name]
          : requireNode(name),
    process: { env: {} },
    Buffer,
    URL,
    URLSearchParams,
    Request,
    Response,
    AbortSignal,
    ...extra,
  });
  return testModule.exports as T;
}
test("member route rejects disabled, cross-origin and inactive calls before provider or reservation", async () => {
  for (const gate of ["origin", "flag", "member"]) {
    let queries = 0;
    const route = load<{ POST: (request: Request) => Promise<Response> }>(
      "app/api/member/assistant/route.ts",
      {
        "@/lib/supabase-server": {
          supabaseAdmin: {
            rpc: async () => {
              queries++;
              throw Error("must not reserve");
            },
          },
        },
        "@/lib/member-ai/server": {
          memberApiEnabled: () => gate !== "flag",
          memberActor: async () => {
            throw Error("inactive");
          },
          platformKey: async () => {
            throw Error("must not read");
          },
        },
        "@/lib/member-ai/http": {
          memberOriginAllowed: () => gate !== "origin",
        },
        "@/lib/member-ai/model": model,
        "@/lib/member-ai/agent": {},
        "@/lib/member-ai/reply-stream": { createReplyStream },
        "@/lib/member-ai/title-server": { titleConversation: async () => {} },
        "@/lib/member-ai/images": { modelChatImages: async () => [] },
        "next/server": { after: () => {} },
        "@/lib/fcos/resources": {
          readFcosResource: async () => {
            throw Error("must not read resources before authorization");
          },
        },
        "@/lib/member-ai/emdee": {},
        "@/lib/daily/model": {},
      },
    );
    const response = await route.POST(
      new Request("https://app.whatelz.ai/api/member/assistant", {
        method: "POST",
      }),
    );
    assert.equal(response.status, gate === "flag" ? 503 : 403);
    assert.equal(queries, 0);
  }
});
test("admin changes independently require the configured owner", async () => {
  let touched = false;
  const action = load<{ manageMember: (input: unknown) => Promise<unknown> }>(
    "app/admin/users/actions.ts",
    {
      "next/cache": { revalidatePath: () => {} },
      "@/lib/team-assignment": { hasTeamAssignment: async () => true },
      "@/lib/daily/server": {
        dailyOwner: async () => {
          throw Error("Owner required");
        },
      },
      "@/lib/supabase-server": {
        supabaseAdmin: new Proxy(
          {},
          {
            get: () => {
              touched = true;
              throw Error("must not access");
            },
          },
        ),
      },
      "@/lib/member-ai/model": model,
    },
  );
  await assert.rejects(
    action.manageMember({ action: "reset" }),
    /Owner required/,
  );
  assert.equal(touched, false);
});
test("vault reads reject shared wrappers, traversal and sibling collections", async () => {
  let calls = 0;
  const vault = load<{
    allowedVaultPath: (path: string, parent: string) => boolean;
    readMemberVault: (
      user: string,
      path: string,
    ) => Promise<{ available: boolean }>;
  }>(
    "lib/member-ai/emdee.ts",
    {
      "next/headers": {},
      "@/lib/daily/crypto": {
        decryptSecret: () =>
          JSON.stringify({
            token: "fake",
            expiresAt: Date.now() + 60000,
            parentPath: "example/DAILY.md",
          }),
      },
      "@/lib/daily/oauth": {
        validParentPath: (path: string) =>
          /^[A-Za-z0-9_./-]+\.md$/.test(path) &&
          !path.startsWith("/") &&
          !path.split("/").some((x) => x === "." || x === ".."),
      },
      "@/lib/daily/emdee-client": {
        emdeeCall: async () => {
          calls++;
        },
      },
      "@/lib/supabase-server": {
        supabaseAdmin: {
          from: () => ({
            select() {
              return this;
            },
            eq() {
              return this;
            },
            maybeSingle: async () => ({
              data: {
                subject: "subject",
                vault_id: "vault",
                parent_path: "example/DAILY.md",
                encrypted_credentials: "fake",
              },
              error: null,
            }),
          }),
        },
      },
    },
    {
      fetch: async () => {
        calls++;
        throw Error("must not fetch");
      },
    },
  );
  for (const path of [
    "__shared__/other/DAILY.md",
    "example/daily/../SECRET.md",
    "example/books/SECRET.md",
    "/example/DAILY.md",
  ]) {
    assert.equal(vault.allowedVaultPath(path, "example/DAILY.md"), false);
    assert.equal(
      (await vault.readMemberVault("member", path)).available,
      false,
    );
  }
  assert.equal(
    vault.allowedVaultPath("example/daily/2026-10-21.md", "example/DAILY.md"),
    true,
  );
  assert.equal(calls, 0);
});

test("Chat eligibility follows tree activation, not owner identity, and enrollment failures deny access", async () => {
  for (const [user, assigned, failure, allowed] of [
    [null, true, false, false],
    [{ id: "member", role: "unauthorized" }, true, false, true],
    [{ id: "owner", role: "admin" }, false, false, false],
    [{ id: "member", role: "unauthorized" }, true, true, false],
  ] as const) {
    let enrollments = 0;
    const server = load<{
      memberActor: () => Promise<{ user: { id: string } }>;
    }>("lib/member-ai/server.ts", {
      "@/lib/team-assignment": { hasTeamAssignment: async () => assigned },
      "@/lib/users": { ensureUserRow: async () => user },
      "@/lib/admin-policy": { isOwnerUser: () => false },
      "./model": model,
      "@/lib/daily/connections": {
        openaiConnection: () => {
          throw Error("No provider key in eligibility");
        },
      },
      "@/lib/supabase-server": {
        supabaseAdmin: {
          rpc: async (name: string, args: { p_user: string }) => {
            enrollments++;
            assert.equal(name, "ensure_activated_member_ai");
            assert.equal(args.p_user, user?.id);
            return {
              data: {
                active: true,
                model: "gpt-6-luna",
                allowance_micro: 5000000,
                current_cycle_id: null,
              },
              error: failure ? { message: "unavailable" } : null,
            };
          },
        },
      },
    });
    if (allowed) assert.equal((await server.memberActor()).user.id, user!.id);
    else await assert.rejects(server.memberActor());
    assert.equal(enrollments, user && assigned ? 1 : 0);
  }
});

test("attention loader verifies identity, scopes private sources and preserves source failures", async () => {
  const attention = await import("../lib/fcos/attention");
  const fcos = await import("../lib/fcos/model");
  const calls: { table: string; filters: unknown[][] }[] = [];
  const dashboard = load<{
    loadAttentionDashboard: () => Promise<{
      leads: { count: number | null };
      tasks: { count: number | null };
      items: unknown[];
      calendarAvailable: boolean;
    }>;
  }>("lib/fcos/dashboard.ts", {
    "./server": { fcosOwner: async () => "verified-owner" },
    "./attention": attention,
    "./model": fcos,
    "@/lib/leads/model": { todayUtc8: () => "2026-10-22" },
    "@/lib/community-calendar/server": {
      loadCommunityCalendar: async () => {
        throw Error("Unavailable");
      },
    },
    "@/lib/supabase-server": {
      supabaseAdmin: {
        from: (table: string) => {
          const entry = { table, filters: [] as unknown[][] };
          calls.push(entry);
          const query = {
            select() {
              return this;
            },
            eq(...args: unknown[]) {
              entry.filters.push(args);
              return this;
            },
            not() {
              return this;
            },
            lte() {
              return this;
            },
            in() {
              return this;
            },
            or() {
              return this;
            },
            order() {
              return this;
            },
            limit: async () => ({
              data: [],
              count: table === "daily_tasks" ? 8 : 0,
              error:
                table === "member_leads" ? { message: "Unavailable" } : null,
            }),
          };
          return query;
        },
      },
    },
  });
  const result = await dashboard.loadAttentionDashboard();
  assert.equal(result.leads.count, null);
  assert.equal(result.tasks.count, 8);
  assert.equal(result.calendarAvailable, false);
  for (const call of calls)
    assert.ok(
      call.filters.some(
        (filter) => filter[0] === "owner_id" && filter[1] === "verified-owner",
      ),
    );
  assert.equal(calls.length, 3);
});

test("shared-note reads require an active grant to the verified recipient and select only the note", async () => {
  for (const granted of [false, true]) {
    const calls: { table: string; columns: string; filters: unknown[][] }[] =
      [];
    const sharing = load<{
      loadSharedBriefing: (id: string) => Promise<unknown>;
    }>("lib/fcos/sharing.ts", {
      "./server": { fcosOwner: async () => "verified-recipient" },
      "@/lib/team/server": {},
      "@/lib/supabase-server": {
        supabaseAdmin: {
          from: (table: string) => {
            const entry = { table, columns: "", filters: [] as unknown[][] };
            calls.push(entry);
            return {
              select(value: string) {
                entry.columns = value;
                return this;
              },
              eq(...args: unknown[]) {
                entry.filters.push(args);
                return this;
              },
              is(...args: unknown[]) {
                entry.filters.push(args);
                return this;
              },
              maybeSingle: async () => ({
                data:
                  table === "member_briefing_shares"
                    ? granted
                      ? { briefing_id: "note" }
                      : null
                    : { id: "note", title: "Shared example" },
                error: null,
              }),
            };
          },
        },
      },
    });
    const result = await sharing.loadSharedBriefing("note");
    assert.ok(
      calls[0].filters.some(
        (value) =>
          value[0] === "recipient_user_id" && value[1] === "verified-recipient",
      ),
    );
    assert.ok(
      calls[0].filters.some(
        (value) => value[0] === "revoked_at" && value[1] === null,
      ),
    );
    if (!granted) {
      assert.equal(result, null);
      assert.equal(calls.length, 1);
    } else {
      assert.equal(calls.length, 2);
      assert.doesNotMatch(
        calls[1].columns,
        /lead_ids|owner_id|event_key|email|phone/,
      );
    }
  }
});

test("sharing cannot mutate another owner's note or grant an unlisted account", async () => {
  for (const owned of [false, true]) {
    let writes = 0;
    const actions = load<{
      changeNoteSharing: (
        state: unknown,
        form: FormData,
      ) => Promise<{ message: string }>;
    }>(
      "app/briefings/sharing-actions.ts",
      {
        "next/cache": { revalidatePath: () => {} },
        "@/lib/fcos/server": {
          fcosOwner: async () => "owner",
          loadBriefing: async () => (owned ? { id: "note" } : null),
        },
        "@/lib/fcos/sharing": { shareRecipients: async () => [] },
        "@/lib/supabase-server": {
          supabaseAdmin: {
            from: () => {
              writes++;
              throw Error("Must not write");
            },
          },
        },
      },
      { FormData },
    );
    const form = new FormData();
    form.set("id", "00000000-0000-4000-8000-000000000001");
    form.set("recipient", "00000000-0000-4000-8000-000000000002");
    form.set("operation", "share");
    assert.match(
      (await actions.changeNoteSharing({}, form)).message,
      /unavailable/,
    );
    assert.equal(writes, 0);
  }
});

test("note event lookups use the real calendar membership and no preview persona", async () => {
  const calls: unknown[][] = [];
  const events = load<{
    calendarEvent: (month: string, key: string) => Promise<unknown>;
  }>("lib/fcos/events.ts", {
    "@/lib/community-calendar/server": {
      loadCommunityCalendar: async (...args: unknown[]) => {
        calls.push(args);
        return { events: [{ id: "permitted" }] };
      },
    },
    "@/lib/community-calendar/model": {
      validMonth: (month: string) => month === "2026-10",
      localDay: () => "2026-10-22",
    },
  });
  assert.equal(await events.calendarEvent("bad", "permitted"), null);
  assert.equal(await events.calendarEvent("2026-10", "restricted"), null);
  assert.ok(await events.calendarEvent("2026-10", "permitted"));
  for (const args of calls) assert.deepEqual(args, ["2026-10"]);
});

test("note grants use the verified owner and selected team label; revocation is owner-scoped", async () => {
  for (const operation of ["share", "revoke"]) {
    const owner = "00000000-0000-4000-8000-000000000001",
      recipient = "00000000-0000-4000-8000-000000000002";
    let written: Record<string, unknown> | undefined;
    const filters: unknown[][] = [];
    const query = {
      eq(...args: unknown[]) {
        filters.push(args);
        return this;
      },
      then(resolve: (value: unknown) => unknown) {
        return Promise.resolve({ error: null }).then(resolve);
      },
    };
    const actions = load<{
      changeNoteSharing: (
        state: unknown,
        form: FormData,
      ) => Promise<{ message: string }>;
    }>(
      "app/briefings/sharing-actions.ts",
      {
        "next/cache": { revalidatePath: () => {} },
        "@/lib/fcos/server": {
          fcosOwner: async () => owner,
          loadBriefing: async () => ({ id: "note" }),
        },
        "@/lib/fcos/sharing": {
          shareRecipients: async () => [
            { id: recipient, label: "Verified team person" },
          ],
        },
        "@/lib/supabase-server": {
          supabaseAdmin: {
            from: () => ({
              upsert: async (value: Record<string, unknown>) => {
                written = value;
                return { error: null };
              },
              update: (value: Record<string, unknown>) => {
                written = value;
                return query;
              },
            }),
          },
        },
      },
      { FormData },
    );
    const form = new FormData();
    form.set("id", "00000000-0000-4000-8000-000000000003");
    form.set("recipient", recipient);
    form.set("operation", operation);
    form.set("owner_id", recipient);
    form.set("recipient_label", "Forged label");
    assert.match(
      (await actions.changeNoteSharing({}, form)).message,
      operation === "share" ? /now shared/ : /revoked/,
    );
    if (operation === "share") {
      assert.equal(written?.owner_id, owner);
      assert.equal(written?.recipient_label, "Verified team person");
    } else {
      assert.ok(
        filters.some((value) => value[0] === "owner_id" && value[1] === owner),
      );
      assert.ok(written?.revoked_at);
    }
  }
});

test("blank Chat skips transcript reads while latest Chat loads only its owner's messages", async () => {
  for (const blank of [true, false]) {
    const calls: { table: string; filters: unknown[][] }[] = [];
    const server = load<{
      memberWorkspace: (
        id?: string,
        blank?: boolean,
      ) => Promise<{ selected: string | null; messages: unknown[] }>;
    }>("lib/member-ai/server.ts", {
      "@/lib/team-assignment": { hasTeamAssignment: async () => true },
      "@/lib/users": {
        ensureUserRow: async () => ({
          id: "owner",
          role: "admin",
          name: "Example",
        }),
      },
      "@/lib/admin-policy": { isOwnerUser: () => true },
      "@/lib/daily/connections": {},
      "./model": model,
      "@/lib/supabase-server": {
        supabaseAdmin: {
          rpc: async () => ({
            data: {
              active: true,
              model: "gpt-6-luna",
              allowance_micro: 5000000,
              current_cycle_id: null,
            },
            error: null,
          }),
          from: (table: string) => {
            const call = { table, filters: [] as unknown[][] };
            calls.push(call);
            return {
              select() {
                return this;
              },
              eq(...args: unknown[]) {
                call.filters.push(args);
                return this;
              },
              in() {
                return this;
              },
              not() {
                return this;
              },
              order() {
                return this;
              },
              limit: async () => ({
                error: null,
                data:
                  table === "member_ai_conversations"
                    ? [{ id: "latest" }]
                    : table === "member_ai_messages"
                      ? [
                          {
                            id: "message",
                            role: "assistant",
                            body: "Example",
                            proposals: [],
                          },
                        ]
                      : [],
              }),
              maybeSingle: async () => ({
                error: null,
                data:
                  table === "member_ai_access"
                    ? {
                        active: true,
                        model: "gpt-6-luna",
                        current_cycle_id: null,
                      }
                    : table === "member_ai_conversations"
                      ? { id: "latest" }
                      : null,
              }),
            };
          },
        },
      },
    });
    const workspace = await server.memberWorkspace(undefined, blank);
    assert.equal(workspace.selected, blank ? null : "latest");
    assert.equal(workspace.messages.length, blank ? 0 : 1);
    const transcriptCalls = calls.filter(
      (call) => call.table === "member_ai_messages",
    );
    assert.equal(transcriptCalls.length, blank ? 0 : 1);
    for (const call of transcriptCalls)
      assert.ok(
        call.filters.some(
          (filter) => filter[0] === "user_id" && filter[1] === "owner",
        ),
      );
  }
});
test("first-send conversation creation verifies the owner and never accepts a caller-supplied identity", async () => {
  for (const allowed of [false, true]) {
    let row: Record<string, unknown> | undefined;
    const actions = load<{ createConversation: () => Promise<{ id: string }> }>(
      "app/assistant/actions.ts",
      {
        "next/navigation": {},
        "next/cache": {},
        "@/lib/member-ai/server": {
          memberActor: async () => {
            if (!allowed) throw Error("Owner required");
            return { user: { id: "verified-owner" } };
          },
        },
        "@/lib/member-ai/model": model,
        "@/lib/daily/model": { singaporeDay: () => "2026-10-22" },
        "@/lib/supabase-server": {
          supabaseAdmin: {
            from: () => ({
              insert: (value: Record<string, unknown>) => {
                row = value;
                return {
                  select: () => ({
                    single: async () => ({
                      data: { id: "created" },
                      error: null,
                    }),
                  }),
                };
              },
            }),
          },
        },
      },
    );
    if (allowed) {
      assert.equal((await actions.createConversation()).id, "created");
      assert.equal(row?.user_id, "verified-owner");
    } else {
      await assert.rejects(actions.createConversation(), /Owner required/);
      assert.equal(row, undefined);
    }
  }
});

test("Profile usage rejects anonymous reads and scopes every private query to the verified account", async () => {
  let calls = 0;
  const anonymous = load<{ loadProfileData: () => Promise<unknown> }>(
    "lib/profile/server.ts",
    {
      "@/lib/app-access": { requireAssignedUser: async () => null },
      "@/lib/supabase-server": {
        supabaseAdmin: {
          from: () => {
            calls++;
            throw Error("unexpected query");
          },
        },
      },
      "@/lib/admin-policy": { isOwnerUser: () => false },
      "@/lib/community-calendar/personas": {
        isPersona: (p: unknown) => p === "Catalyst",
      },
      "@/lib/member-ai/server": { memberApiEnabled: () => true },
      "./usage": profileUsage,
    },
  );
  await assert.rejects(anonymous.loadProfileData(), /Sign in/);
  assert.equal(calls, 0);
  const filters: [string, string, unknown][] = [];
  const queries: {
    table: string;
    filters: Record<string, unknown>;
    selected: string;
  }[] = [];
  function from(table: string) {
    const state = {
      table,
      filters: {} as Record<string, unknown>,
      selected: "",
    };
    queries.push(state);
    const result = () => ({
      data:
        table === "community_calendar_memberships"
          ? { persona: "Catalyst" }
          : table === "member_ai_access"
            ? {
                active: true,
                model: "gpt-6.1-sol",
                allowance_micro: 5000000,
                current_cycle_id: null,
              }
            : [],
      error: null,
      count: 0,
    });
    const chain = {
      select(value: string) {
        state.selected = value;
        return this;
      },
      eq(key: string, value: unknown) {
        filters.push([table, key, value]);
        state.filters[key] = value;
        return this;
      },
      order() {
        return this;
      },
      limit() {
        return this;
      },
      maybeSingle() {
        return Promise.resolve(result());
      },
      then(resolve: (value: unknown) => unknown) {
        return Promise.resolve(result()).then(resolve);
      },
    };
    return chain;
  }
  const signedIn = load<{
    loadProfileData: () => Promise<{
      usage: { canChat: boolean; allowance: number };
    }>;
  }>("lib/profile/server.ts", {
    "@/lib/app-access": {
      requireAssignedUser: async () => ({ id: "verified-account" }),
    },
    "@/lib/supabase-server": { supabaseAdmin: { from } },
    "@/lib/admin-policy": { isOwnerUser: () => false },
    "@/lib/community-calendar/personas": {
      isPersona: (p: unknown) => p === "Catalyst",
    },
    "@/lib/member-ai/server": { memberApiEnabled: () => true },
    "./usage": profileUsage,
  });
  const result = await signedIn.loadProfileData();
  assert.equal(result.usage.canChat, true);
  assert.equal(result.usage.allowance, 5000000);
  assert.equal(queries.length, 5);
  for (const query of queries) {
    assert.equal(query.filters.user_id, "verified-account");
    assert.doesNotMatch(query.selected, /encrypted|credential|subject|body/);
  }
  assert.ok(
    filters.some(
      ([, key, value]) => key === "reason" && value === "owner-reset",
    ),
  );
});

test("streaming route keeps settlement alive after disconnect and replay cannot invoke provider twice", async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const pendingAfter: Promise<unknown>[] = [];
  const titleTasks: (() => Promise<unknown>)[] = [];
  let titleCalls = 0;
  const settlements: Record<string, unknown>[] = [];
  let invoked = 0;
  let reserved = false;
  let complete = false;
  const user = "11111111-1111-4111-8111-111111111111";
  const route = load<{ POST: (request: Request) => Promise<Response> }>(
    "app/api/member/assistant/route.ts",
    {
      "next/server": {
        after: (task: Promise<unknown> | (() => Promise<unknown>)) => {
          if (typeof task !== "function") pendingAfter.push(task);
          else titleTasks.push(task);
        },
      },
      "@/lib/member-ai/reply-stream": { createReplyStream },
      "@/lib/member-ai/title-server": {
        titleConversation: async (owner: string) => {
          assert.equal(owner, user);
          titleCalls++;
        },
      },
      "@/lib/member-ai/images": { modelChatImages: async () => [] },
      "@/lib/supabase-server": {
        supabaseAdmin: {
          rpc: async (name: string, args: Record<string, unknown>) => {
            if (name === "reserve_member_ai_images") {
              if (reserved)
                return {
                  data: {
                    duplicate: true,
                    status: complete ? "completed" : "running",
                  },
                  error: null,
                };
              reserved = true;
              return { data: { duplicate: false }, error: null };
            }
            assert.equal(name, "finish_member_ai");
            settlements.push(args);
            complete = true;
            return { error: null };
          },
        },
      },
      "@/lib/member-ai/server": {
        memberApiEnabled: () => true,
        memberActor: async () => ({
          user: { id: user },
          access: { model: "gpt-6-luna" },
        }),
        platformKey: async () => "fixture",
        conversationMessages: async () => [],
      },
      "@/lib/member-ai/http": { memberOriginAllowed: () => true },
      "@/lib/member-ai/model": model,
      "@/lib/member-ai/agent": {
        runMemberAgent: async (options: {
          onText: (text: string) => void;
          receipt: Record<string, unknown>;
        }) => {
          invoked++;
          options.onText("First chunk");
          await gate;
          Object.assign(options.receipt, {
            input: 10,
            output: 2,
            charge: 2,
            uncertain: false,
          });
          return { body: "First chunk", proposals: [] };
        },
      },
      "@/lib/fcos/resources": { readFcosResource: async () => ({}) },
      "@/lib/member-ai/emdee": { readMemberVault: async () => ({}) },
      "@/lib/daily/model": { singaporeDay: () => "2026-10-22" },
    },
  );
  const request = () =>
    new Request("https://app.whatelz.ai/api/member/assistant", {
      method: "POST",
      headers: { Accept: "application/x-ndjson" },
      body: JSON.stringify({
        requestId: "22222222-2222-4222-8222-222222222222",
        conversationId: "33333333-3333-4333-8333-333333333333",
        text: "Hello",
      }),
    });
  const response = await route.POST(request());
  const reader = response.body!.getReader();
  assert.match(new TextDecoder().decode((await reader.read()).value), /start/);
  assert.match(
    new TextDecoder().decode((await reader.read()).value),
    /First chunk/,
  );
  assert.equal(settlements.length, 0);
  assert.equal(pendingAfter.length, 1);
  await reader.cancel();
  release();
  await Promise.all(pendingAfter);
  assert.equal(settlements.length, 1);
  assert.equal(titleCalls, 0);
  assert.equal(titleTasks.length, 1);
  await titleTasks[0]();
  assert.equal(titleCalls, 1);
  assert.equal(settlements[0].p_user, user);
  assert.equal(settlements[0].p_charge, 2);
  assert.equal(settlements[0].p_uncertain, false);
  const duplicate = await route.POST(request());
  assert.equal((await duplicate.json()).status, "completed");
  assert.equal(invoked, 1);
});

test("streaming route sends an explicit error only after retaining an uncertain provider reservation", async () => {
  const settlements: Record<string, unknown>[] = [];
  const tasks: Promise<unknown>[] = [];
  const route = load<{ POST: (request: Request) => Promise<Response> }>(
    "app/api/member/assistant/route.ts",
    {
      "next/server": {
        after: (task: Promise<unknown> | (() => Promise<unknown>)) => {
          if (typeof task !== "function") tasks.push(task);
        },
      },
      "@/lib/member-ai/reply-stream": { createReplyStream },
      "@/lib/member-ai/title-server": { titleConversation: async () => {} },
      "@/lib/member-ai/images": { modelChatImages: async () => [] },
      "@/lib/supabase-server": {
        supabaseAdmin: {
          rpc: async (name: string, args: Record<string, unknown>) => {
            if (name === "finish_member_ai") settlements.push(args);
            return { data: { duplicate: false }, error: null };
          },
        },
      },
      "@/lib/member-ai/server": {
        memberApiEnabled: () => true,
        memberActor: async () => ({
          user: { id: "fixture-user" },
          access: { model: "gpt-6-luna" },
        }),
        platformKey: async () => "fixture",
        conversationMessages: async () => [],
      },
      "@/lib/member-ai/http": { memberOriginAllowed: () => true },
      "@/lib/member-ai/model": model,
      "@/lib/member-ai/agent": {
        runMemberAgent: async (options: {
          onText: (text: string) => void;
          receipt: { uncertain: boolean };
        }) => {
          options.onText("Partial");
          options.receipt.uncertain = true;
          throw Error("Stream interrupted");
        },
      },
      "@/lib/fcos/resources": {},
      "@/lib/member-ai/emdee": {},
      "@/lib/daily/model": { singaporeDay: () => "2026-10-22" },
    },
  );
  const response = await route.POST(
    new Request("https://app.whatelz.ai/api/member/assistant", {
      method: "POST",
      headers: { Accept: "application/x-ndjson" },
      body: JSON.stringify({
        requestId: "22222222-2222-4222-8222-222222222222",
        conversationId: "33333333-3333-4333-8333-333333333333",
        text: "Hello",
      }),
    }),
  );
  let text = "";
  await assert.rejects(
    () =>
      readReply(response, (chunk) => {
        text += chunk;
      }),
    /allowance remains reserved/,
  );
  await Promise.all(tasks);
  assert.equal(text, "Partial");
  assert.equal(settlements[0].p_failed, true);
  assert.equal(settlements[0].p_uncertain, true);
  assert.equal(settlements[0].p_body, "");
});

test("image reads require the verified owner before downloading private storage", async () => {
  for (const allowed of [false, true]) {
    const filters: unknown[][] = [];
    let downloads = 0;
    const route = load<{ GET: (r: Request, p: unknown) => Promise<Response> }>(
      "app/api/member/assistant/images/[id]/route.ts",
      {
        "@/lib/app-access": {
          requireAssignedUser: async () => ({ id: "owner" }),
        },
        "@/lib/member-ai/images": {
          chatImagePath: (u: string, id: string) => `${u}/${id}.webp`,
        },
        "@/lib/supabase-server": {
          supabaseAdmin: {
            from: () => ({
              select() {
                return this;
              },
              eq(...args: unknown[]) {
                filters.push(args);
                return this;
              },
              maybeSingle: async () => ({
                data: allowed ? { id: "fixture" } : null,
              }),
            }),
            storage: {
              from: (bucket: string) => ({
                download: async (path: string) => {
                  downloads++;
                  assert.equal(bucket, "chat-images");
                  assert.match(path, /^owner\//);
                  return { data: new Blob(["fixture"]) };
                },
              }),
            },
          },
        },
      },
    );
    const response = await route.GET(new Request("https://app.whatelz.ai"), {
      params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
    });
    assert.equal(response.status, allowed ? 200 : 404);
    assert.ok(
      filters.some(([key, value]) => key === "user_id" && value === "owner"),
    );
    assert.equal(downloads, allowed ? 1 : 0);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  }
});

test("dictation authenticates before reading media and settles success, rejection and unknown outcomes", async () => {
  const { encodeVoice } = await import("../lib/member-ai/media");
  const media = await import("../lib/member-ai/media");
  for (const outcome of [
    "inactive",
    "cached",
    "success",
    "rejected",
    "network",
  ]) {
    let providerCalls = 0;
    const settlements: Record<string, unknown>[] = [];
    const route = load<{ POST: (r: Request) => Promise<Response> }>(
      "app/api/member/assistant/transcribe/route.ts",
      {
        "@/lib/member-ai/server": {
          memberActor: async () => {
            if (outcome === "inactive") throw Error("Inactive");
            return { user: { id: "owner" } };
          },
          memberApiEnabled: () => true,
          platformKey: async () => "fixture",
        },
        "@/lib/member-ai/http": { memberOriginAllowed: () => true },
        "@/lib/member-ai/media": media,
        "@/lib/supabase-server": {
          supabaseAdmin: {
            rpc: async (name: string, args: Record<string, unknown>) => {
              assert.equal(args.p_user, "owner");
              if (name === "reserve_member_dictation")
                return {
                  data:
                    outcome === "cached"
                      ? {
                          duplicate: true,
                          status: "completed",
                          text: "Cached draft",
                        }
                      : { duplicate: false },
                };
              assert.equal(name, "finish_member_dictation");
              settlements.push(args);
              return {};
            },
          },
        },
      },
      {
        File,
        FormData,
        Blob,
        fetch: async () => {
          providerCalls++;
          if (outcome === "network") throw Error("Lost connection");
          return outcome === "rejected"
            ? new Response(null, { status: 400 })
            : Response.json({ text: "Editable draft" });
        },
      },
    );
    const form = new FormData();
    form.set("requestId", "11111111-1111-4111-8111-111111111111");
    const bytes = encodeVoice([new Float32Array(16000)], 16000);
    form.set(
      "audio",
      new Blob([bytes.buffer as ArrayBuffer], { type: "audio/wav" }),
      "test.wav",
    );
    const response = await route.POST(
      new Request("https://app.whatelz.ai", { method: "POST", body: form }),
    );
    assert.equal(
      response.status,
      outcome === "inactive"
        ? 400
        : outcome === "rejected" || outcome === "network"
          ? 502
          : 200,
    );
    assert.equal(
      providerCalls,
      outcome === "inactive" || outcome === "cached" ? 0 : 1,
    );
    assert.equal(settlements.length, providerCalls);
    if (settlements.length) {
      assert.equal(settlements[0].p_uncertain, outcome === "network");
      assert.equal(settlements[0].p_failed, outcome !== "success");
    }
    if (outcome === "success")
      assert.equal((await response.json()).text, "Editable draft");
  }
});

test("database culture authenticates before data access, filters published rows and paginates without a bundled fallback", async () => {
  const model = await import("../lib/knowledge/model");
  for (const signedIn of [false, true]) {
    const calls: { table: string; filters: unknown[][]; range?: number[] }[] =
      [];
    const server = load<{
      loadCulture: () => Promise<{ quotes: unknown[] }[]>;
    }>("lib/knowledge/server.ts", {
      "@/lib/app-access": {
        requireAssignedUser: async () => {
          if (!signedIn) throw Error("Sign in");
          return { id: "owner" };
        },
      },
      "./model": model,
      "@/lib/supabase-server": {
        supabaseAdmin: {
          from: (table: string) => {
            const call: {
              table: string;
              filters: unknown[][];
              range?: number[];
            } = { table, filters: [] };
            calls.push(call);
            const collection = {
              id: "sample",
              title: "Sample",
              metadata: {
                displayName: "Sample",
                teacher: "Teacher",
                chapters: [],
              },
            };
            return {
              select() {
                return this;
              },
              eq(...args: unknown[]) {
                call.filters.push(args);
                return this;
              },
              in(...args: unknown[]) {
                call.filters.push(args);
                return this;
              },
              order() {
                return this;
              },
              then(resolve: (x: unknown) => unknown) {
                return Promise.resolve({ data: [collection] }).then(resolve);
              },
              range(start: number, end: number) {
                call.range = [start, end];
                return Promise.resolve({
                  data: Array.from(
                    { length: start === 0 ? 500 : 1 },
                    (_, i) => ({
                      id: "sample-" + (start + i),
                      collection_id: "sample",
                      body: "Synthetic saying",
                      metadata: { chapters: [] },
                    }),
                  ),
                });
              },
            };
          },
        },
      },
    });
    if (!signedIn) {
      await assert.rejects(() => server.loadCulture(), /Sign in/);
      assert.equal(calls.length, 0);
      continue;
    }
    assert.equal((await server.loadCulture())[0].quotes.length, 501);
    assert.deepEqual(
      calls.filter((x) => x.range).map((x) => x.range),
      [
        [0, 499],
        [500, 999],
      ],
    );
    for (const call of calls)
      assert.ok(
        call.filters.some(
          ([key, value]) => key === "published" && value === true,
        ),
      );
    assert.ok(
      calls[0].filters.some(
        ([key, value]) => key === "kind" && value === "culture",
      ),
    );
  }
});
