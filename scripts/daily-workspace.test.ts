import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import * as model from "../lib/daily/model";
import * as paths from "../lib/daily/paths";
import * as weeklyModel from "../lib/daily/weekly-model";
const requireNode = createRequire(import.meta.url);
const OWNER = "11111111-1111-4111-8111-111111111111";
function load(
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
  const testModule = {
    exports: {} as Record<string, (...args: unknown[]) => unknown>,
  };
  vm.runInNewContext(code, {
    module: testModule,
    exports: testModule.exports,
    require: (name: string) =>
      name === "server-only"
        ? {}
        : name === "@/lib/daily/settings"
          ? load("lib/daily/settings.ts", mocks, extra)
          : name === "./settings"
            ? load("lib/daily/settings.ts", mocks, extra)
            : name === "./paths"
              ? paths
              : name === "./emdee-client" && !(name in mocks)
                ? load("lib/daily/emdee-client.ts", mocks, extra)
                : name in mocks
                  ? mocks[name]
                  : requireNode(name),
    process: {
      env: {
        DAILY_INTEGRATION_KEY: "a".repeat(64),
        DAILY_API_GENERATION_ENABLED: "true",
      },
    },
    Buffer,
    URL,
    URLSearchParams,
    Headers,
    Request,
    Response,
    AbortSignal,
    console,
    ...extra,
  });
  return testModule.exports;
}
test("daily dates follow Singapore at midnight and preserve prior-day handoff across year boundaries", () => {
  assert.equal(
    model.singaporeDay(new Date("2026-10-19T15:59:59Z")),
    "2026-10-19",
  );
  assert.equal(
    model.singaporeDay(new Date("2026-10-19T16:00:00Z")),
    "2026-10-20",
  );
  assert.equal(model.previousDay("2027-01-01"), "2026-12-31");
  assert.equal(model.previousDay("2028-03-01"), "2028-02-29");
  assert.throws(() =>
    model.briefPath("private/DAILY.md", "2026-02-30", "morning"),
  );
});
test("private credentials encrypt with random nonces and reject tampering", () => {
  const crypto = load("lib/daily/crypto.ts", {});
  const first = crypto.encryptSecret("test-only-secret") as string;
  const second = crypto.encryptSecret("test-only-secret") as string;
  assert.notEqual(first, second);
  assert.ok(!first.includes("test-only-secret"));
  assert.equal(crypto.decryptSecret(first), "test-only-secret");
  const parts = first.split(":");
  parts[1] = (parts[1][0] === "0" ? "1" : "0") + parts[1].slice(1);
  assert.throws(() => crypto.decryptSecret(parts.join(":")));
});
function emdeeMock(existing: boolean, hash = "1".repeat(16)) {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  let body = "### Handoff\n\nOne unfinished commitment.";
  let present = existing;
  const parent = paths.DAILY_PARENT;
  const path = model.briefPath(parent, "2026-10-19", "morning");
  const api = load(
    "lib/daily/emdee.ts",
    {
      "./server": { dailyOwner: async () => OWNER },
      "./connections": {
        emdeeConnection: async () => ({
          token: "test-token",
          expiresAt: Date.now() + 60000,
          parentPath: parent,
        }),
      },
      "./model": model,
    },
    {
      fetch: async (_url: string, init: RequestInit) => {
        const rpc = JSON.parse(init.body as string);
        const name = rpc.params.arguments.action;
        const args = rpc.params.arguments.arguments;
        assert.equal(
          rpc.params.name,
          name === "get_doc" || name === "list_docs" ? "read" : "write",
        );
        calls.push({ name, args });
        let result: unknown;
        if (name === "list_docs") result = present ? [{ path }] : [];
        else if (name === "get_doc")
          result =
            args.path === parent ||
            args.path === paths.branchParent(parent, "morning")
              ? { doc_content_hash: "parent-hash", sections: [] }
              : !present
                ? { error: "no_such_doc" }
                : {
                    content: `# Brief\n\n## Notes\n\n${body}\n`,
                    sections: [{ heading: "Notes", content_hash: hash }],
                    doc_content_hash: "doc-hash",
                  };
        else if (name === "patch_section" || name === "create_child") {
          present = true;
          body = args.body;
          result = { ok: true };
        }
        return Response.json({
          result: { content: [{ type: "text", text: JSON.stringify(result) }] },
        });
      },
    },
  );
  return { api, calls, path };
}
test("stale EMDEE edits are rejected without writing; brief bodies remain in EMDEE", async () => {
  const { api, calls } = emdeeMock(true);
  await assert.rejects(
    async () =>
      api.saveBrief("2026-10-19", "morning", "new text", "2".repeat(16)),
    /changed in EMDEE/,
  );
  assert.ok(
    !calls.some((c) => ["patch_section", "create_child"].includes(c.name)),
  );
});
test("new brief creates reciprocal parent linkage with strict parent hash and verified readback", async () => {
  const { api, calls, path } = emdeeMock(false);
  const saved = (await api.saveBrief(
    "2026-10-19",
    "morning",
    "### Focus\n\nOne step.",
    "",
  )) as model.Brief;
  assert.equal(saved.path, path);
  assert.equal(saved.body, "### Focus\n\nOne step.");
  const created = calls.find((c) => c.name === "create_child")!;
  assert.equal(created.args.expected_parent_content_hash, "parent-hash");
  assert.equal(created.args.no_auto_hash, true);
  assert.equal(created.args.author, "whatelz-daily");
});
test("existing brief patches only Notes with strict section hash", async () => {
  const { api, calls } = emdeeMock(true);
  await api.saveBrief(
    "2026-10-19",
    "morning",
    "### Revised\n\nKeep everything else.",
    "1".repeat(16),
  );
  const patched = calls.find((c) => c.name === "patch_section")!;
  assert.equal(patched.args.heading, "Notes");
  assert.equal(patched.args.expected_content_hash, "1".repeat(16));
  assert.equal(patched.args.no_auto_hash, true);
});
test("EMDEE service failure cannot be mistaken for an empty/missing document", async () => {
  const api = load(
    "lib/daily/emdee.ts",
    {
      "./server": { dailyOwner: async () => OWNER },
      "./connections": {
        emdeeConnection: async () => ({
          token: "token",
          expiresAt: Date.now() + 60000,
          parentPath: "private/DAILY.md",
        }),
      },
      "./model": model,
    },
    { fetch: async () => new Response("unavailable", { status: 503 }) },
  );
  await assert.rejects(
    async () => api.loadBrief("2026-10-19", "morning"),
    /unavailable/,
  );
});
test("OAuth uses PKCE and limits write requests to the chosen parent and briefing folder", async () => {
  let pending: unknown;
  const api = load(
    "lib/daily/oauth.ts",
    {
      "next/headers": {
        headers: async () =>
          new Headers({ origin: "https://admin.whatelz.ai" }),
      },
      "./connections": {
        storeConnection: async (
          _owner: string,
          _provider: string,
          data: unknown,
        ) => {
          pending = data;
        },
        readConnection: async () => pending,
      },
    },
    {
      fetch: async () =>
        Response.json({ client_id: "test-client" }, { status: 201 }),
    },
  );
  for (const path of [
    "../DAILY.md",
    "/private/DAILY.md",
    "private/../DAILY.md",
    "private/daily.txt",
  ])
    assert.equal(api.validParentPath(path), false);
  const destination = (await api.beginEmdeeConnection(
    OWNER,
    "private/DAILY.md",
  )) as string;
  const url = new URL(destination);
  assert.equal(url.origin, "https://emdee.tech");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(
    url.searchParams.get("scope"),
    "docs:read docs:write:private%2FDAILY.md docs:write:private%2Fdaily%2F",
  );
  assert.equal(
    url.searchParams.get("redirect_uri"),
    "https://admin.whatelz.ai/api/admin/daily/emdee/callback",
  );
  await assert.rejects(
    async () =>
      api.finishEmdeeConnection(
        OWNER,
        new URL(
          "https://admin.whatelz.ai/api/admin/daily/emdee/callback?state=wrong&code=test",
        ),
      ),
    /expired|does not match/,
  );
});
test("daily loader denies a foreign administrator before accessing operational data", async () => {
  const api = load("lib/daily/server.ts", {
    "next/navigation": {
      notFound: () => {
        throw Error("denied");
      },
    },
    "@/lib/admin-policy": { isOwnerUser: () => false },
    "@/lib/users": {
      ensureUserRow: async () => ({ id: "other", role: "superadmin" }),
    },
    "@/lib/supabase-server": {
      supabaseAdmin: {
        from: () => {
          throw Error("database accessed");
        },
      },
    },
  });
  await assert.rejects(async () => api.loadDailyTasks("2026-10-19"), /denied/);
});
test("AI generation caps output, disables response storage and labels unavailable sources", async () => {
  let request: Record<string, unknown> = {};
  const api = load(
    "lib/daily/agent.ts",
    { "./model": model },
    {
      fetch: async (_url: string, init: RequestInit) => {
        request = JSON.parse(init.body as string);
        return Response.json({
          status: "completed",
          output: [
            {
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    markdown: "### Focus\n\nReview the proposal.",
                  }),
                },
              ],
            },
          ],
          usage: { input_tokens: 100, output_tokens: 20 },
        });
      },
    },
  );
  await api.generateDailyDraft(
    { key: "test-key", model: "chosen-model" },
    {
      day: "2026-10-19",
      kind: "morning",
      tasks: { active: [], completed: [] },
      previousCloseout: null,
      notes: "Confirm available time.",
    },
  );
  assert.equal(request.max_output_tokens, 2000);
  assert.equal(request.store, false);
  const input = JSON.parse(request.input as string);
  assert.equal(input.sourceAvailability.calendar, "not connected");
  assert.equal(input.sourceAvailability.previousCloseout, "not found");
});
test("atomic slot reservations cap AI preparation at three attempts, including provider failures", async () => {
  const slots = new Set<number>();
  let generationCalls = 0;
  const db = {
    from: () => ({
      insert: (value: { slot: number }) => ({
        select: () => ({
          single: async () => {
            if (slots.has(value.slot))
              return { data: null, error: { code: "23505" } };
            slots.add(value.slot);
            return { data: { id: String(value.slot) }, error: null };
          },
        }),
      }),
      update: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
    }),
  };
  const api = load("app/admin/today/actions.ts", {
    "next/cache": { revalidatePath: () => {} },
    "@/lib/supabase-server": { supabaseAdmin: db },
    "@/lib/daily/server": {
      dailyOwner: async () => OWNER,
      loadDailyTasks: async () => ({ active: [], completed: [] }),
    },
    "@/lib/daily/model": model,
    "@/lib/daily/emdee": {
      loadBrief: async () => ({ exists: false }),
      saveBrief: () => {},
    },
    "@/lib/daily/connections": {
      openaiConnection: async () => ({ key: "test", model: "chosen-model" }),
    },
    "@/lib/daily/agent": {
      generateDailyDraft: async () => {
        generationCalls++;
        throw Error("provider unavailable");
      },
    },
  });
  for (let i = 0; i < 3; i++)
    assert.match(
      (
        (await api.prepareDraft({
          day: model.singaporeDay(),
          kind: "morning",
          notes: "",
        })) as model.ActionResult
      ).error!,
      /AI preparation failed/,
    );
  const capped = (await api.prepareDraft({
    day: model.singaporeDay(),
    kind: "morning",
    notes: "",
  })) as model.ActionResult;
  assert.match(capped.error!, /three preparation attempts/);
  assert.equal(generationCalls, 3);
});

test("personal briefs use distinct Morning/Evening branches while legacy connections retain their paths", () => {
  assert.equal(
    model.briefPath(paths.DAILY_PARENT, "2026-10-19", "morning"),
    "edmund/01-personal/01-daily/01-morning/2026-10-19-MORNING.md",
  );
  assert.equal(
    model.briefPath(paths.DAILY_PARENT, "2026-10-19", "evening"),
    "edmund/01-personal/01-daily/02-evening/2026-10-19-EVENING.md",
  );
  assert.equal(
    model.briefPath(paths.LEGACY_DAILY_PARENT, "2026-10-19", "morning"),
    "edmund/03-projects/02-whatelz_ai/daily-briefings/2026-10-19-MORNING.md",
  );
});
test("weekly ranges are the last completed Singapore Monday–Sunday, including ISO week years", () => {
  const monday = weeklyModel.previousWeek(new Date("2026-10-19T00:00:00Z"));
  assert.deepEqual(monday.days, [
    "2026-10-12",
    "2026-10-13",
    "2026-10-14",
    "2026-10-15",
    "2026-10-16",
    "2026-10-17",
    "2026-10-18",
  ]);
  assert.equal(monday.id, "2026-W42");
  assert.equal(
    weeklyModel.previousWeek(new Date("2027-01-04T00:00:00Z")).id,
    "2026-W53",
  );
  assert.equal(
    weeklyModel.previousWeek(new Date("2026-10-18T15:59:59Z")).end,
    "2026-10-11",
  );
  assert.equal(
    weeklyModel.previousWeek(new Date("2026-10-18T16:00:00Z")).end,
    "2026-10-18",
  );
});
function weeklyHarness(
  options: {
    empty?: boolean;
    failure?: boolean;
    unavailable?: boolean;
    changed?: boolean;
    denied?: boolean;
    legacy?: boolean;
    existing?: boolean;
  } = {},
) {
  const now = new Date("2026-10-19T00:00:00Z");
  const week = weeklyModel.previousWeek(now);
  let row: Record<string, unknown> | null = null;
  let generated = 0;
  let writes = 0;
  let summary: {
    content: string;
    doc_content_hash: string;
    sections: never[];
  } | null = options.existing
    ? {
        content: "# Saved\n\n## Notes\n\nExisting synthesis.",
        doc_content_hash: "existing",
        sections: [],
      }
    : null;
  const docPath = model.briefPath(paths.DAILY_PARENT, week.start, "morning");
  const db = {
    from(table: string) {
      let operation = "select",
        value: Record<string, unknown> = {};
      const filters: Record<string, unknown> = {};
      const query = {
        select() {
          return query;
        },
        eq(key: string, expected: unknown) {
          filters[key] = expected;
          return query;
        },
        insert(data: Record<string, unknown>) {
          operation = "insert";
          value = data;
          return query;
        },
        update(data: Record<string, unknown>) {
          operation = "update";
          value = data;
          return query;
        },
        async maybeSingle() {
          return execute();
        },
        then(resolve: (result: unknown) => unknown) {
          return Promise.resolve(execute()).then(resolve);
        },
      };
      function execute(): { data: unknown; error: null | { code: string } } {
        if (table === "users")
          return { data: { id: OWNER, role: "admin" }, error: null };
        if (operation === "insert") {
          if (row) return { data: null, error: { code: "23505" } };
          row = { ...value };
          return { data: row, error: null };
        }
        if (
          row &&
          Object.entries(filters).some(([key, val]) => row![key] !== val)
        )
          return { data: null, error: null };
        if (operation === "update" && row) Object.assign(row, value);
        return { data: row ? { ...row } : null, error: null };
      }
      return query;
    },
  };
  const api = load("lib/daily/weekly.ts", {
    "@/lib/supabase-server": { supabaseAdmin: db },
    "@/lib/admin-policy": { isOwnerUser: () => !options.denied },
    "./model": model,
    "./weekly-model": weeklyModel,
    "./connections": {
      emdeeConnection: async () => ({
        token: "test",
        parentPath: options.legacy
          ? paths.LEGACY_DAILY_PARENT
          : paths.DAILY_PARENT,
        expiresAt: Date.now() + 60000,
      }),
      openaiConnection: async () => ({ key: "test", model: "selected-model" }),
    },
    "./emdee-client": {
      readEmdee: async (_connection: unknown, path: string) => {
        if (options.unavailable) throw Error("unavailable");
        if (path === week.path) return summary;
        if (path !== docPath || options.empty) return null;
        return {
          content:
            "# Personal morning\n\n## Notes\n\n### Focus\n\nPlan only; completion unknown.",
          doc_content_hash: "source-hash",
          sections: [],
        };
      },
      emdeeCall: async (
        _connection: unknown,
        name: string,
        args: Record<string, unknown>,
      ) => {
        if (name === "get_doc")
          return {
            doc_content_hash:
              options.changed && args.path === docPath
                ? "changed-hash"
                : args.path === docPath
                  ? "source-hash"
                  : "parent-hash",
          };
        assert.equal(name, "create_child");
        writes++;
        assert.equal(args.expected_parent_content_hash, "parent-hash");
        assert.equal(args.no_auto_hash, true);
        assert.equal(
          args.parent_path,
          paths.branchParent(paths.DAILY_PARENT, "weeks"),
        );
        summary = {
          content: `# Week\n\n## Notes\n\n${args.body}`,
          doc_content_hash: "summary-hash",
          sections: [],
        };
        return { ok: true };
      },
    },
    "./agent": {
      generateWeeklyDraft: async (
        _connection: unknown,
        input: { sources: unknown[]; missing: unknown[] },
      ) => {
        generated++;
        assert.equal(input.sources.length, 1);
        assert.equal(input.missing.length, 13);
        if (options.failure) throw Error("provider failed");
        return {
          body: "### Reflection\n\nAn intention was recorded; outcome remains unknown.",
        };
      },
    },
  });
  return {
    api,
    now,
    get row() {
      return row;
    },
    get generated() {
      return generated;
    },
    get writes() {
      return writes;
    },
    get summary() {
      return summary;
    },
  };
}
test("weekly synthesis keeps exact source provenance and missing coverage; duplicate calls spend once", async () => {
  const h = weeklyHarness();
  const results = await Promise.all([
    h.api.runWeekly(OWNER, h.now),
    h.api.runWeekly(OWNER, h.now),
  ]);
  assert.ok(results.includes("completed"));
  assert.equal(h.generated, 1);
  assert.equal(h.writes, 1);
  assert.equal(h.row?.attempts, 1);
  assert.match(h.summary!.content, /1\/14 entries/);
  assert.match(h.summary!.content, /source-hash/);
  assert.match(h.summary!.content, /Original daily entries retained/);
  await h.api.runWeekly(OWNER, h.now, true);
  assert.equal(h.generated, 1);
});
test("weekly empty sources skip inference, unavailable sources fail closed, and old folder credentials cannot write Personal", async () => {
  const empty = weeklyHarness({ empty: true });
  assert.equal(await empty.api.runWeekly(OWNER, empty.now), "empty");
  assert.equal(empty.generated, 0);
  for (const options of [{ unavailable: true }, { legacy: true }]) {
    const h = weeklyHarness(options);
    await assert.rejects(
      async () => h.api.runWeekly(OWNER, h.now),
      /needs attention/,
    );
    assert.equal(h.generated, 0);
    assert.equal(h.writes, 0);
    assert.equal(h.row?.status, "failed");
  }
});
test("source changes prevent summary publication and failed attempts are capped, including manual retries", async () => {
  const changed = weeklyHarness({ changed: true });
  await assert.rejects(
    async () => changed.api.runWeekly(OWNER, changed.now),
    /sources/,
  );
  assert.equal(changed.writes, 0);
  const failed = weeklyHarness({ failure: true });
  await assert.rejects(
    async () => failed.api.runWeekly(OWNER, failed.now),
    /generation/,
  );
  assert.equal(await failed.api.runWeekly(OWNER, failed.now), "failed");
  assert.equal(failed.generated, 1);
  for (let i = 0; i < 2; i++)
    await assert.rejects(
      async () => failed.api.runWeekly(OWNER, failed.now, true),
      /generation/,
    );
  assert.equal(await failed.api.runWeekly(OWNER, failed.now, true), "failed");
  assert.equal(failed.generated, 3);
});
test("weekly recovery preserves an already-written summary without inference; foreign users are denied", async () => {
  const recovered = weeklyHarness({ existing: true });
  assert.equal(
    await recovered.api.runWeekly(OWNER, recovered.now),
    "completed",
  );
  assert.equal(recovered.generated, 0);
  assert.equal(recovered.writes, 0);
  const denied = weeklyHarness({ denied: true });
  await assert.rejects(
    async () => denied.api.runWeekly(OWNER, denied.now),
    /Owner/,
  );
  assert.equal(denied.row, null);
});
test("weekly cron fails closed without secret, does not execute on HEAD, and only runs in production", async () => {
  let calls = 0;
  function route(env: Record<string, string>) {
    return load(
      "app/api/cron/daily-weekly/route.ts",
      {
        "@/lib/daily/weekly": {
          runWeekly: async () => {
            calls++;
            return "completed";
          },
        },
      },
      { process: { env } },
    );
  }
  const request = (secret: string) =>
    new Request("https://whatelz.ai/api/cron/daily-weekly", {
      headers: { authorization: `Bearer ${secret}` },
    });
  assert.equal(
    ((await route({}).GET(request("undefined"))) as Response).status,
    401,
  );
  const env = {
    CRON_SECRET: "test-secret",
    WHATELZ_OWNER_USER_ID: OWNER,
    VERCEL_ENV: "production",
  };
  const api = route(env);
  assert.equal(((await api.GET(request("wrong"))) as Response).status, 401);
  assert.equal(((await api.HEAD()) as Response).status, 405);
  assert.equal(calls, 0);
  assert.equal(
    (
      (await route({ ...env, VERCEL_ENV: "preview" }).GET(
        request("test-secret"),
      )) as Response
    ).status,
    503,
  );
  assert.equal(
    ((await api.GET(request("test-secret"))) as Response).status,
    200,
  );
  assert.equal(calls, 1);
});

test("personal API generation is off by default and never calls the provider", async () => {
  let calls = 0;
  const api = load(
    "lib/daily/agent.ts",
    { "./model": model },
    {
      process: { env: {} },
      fetch: async () => {
        calls++;
        throw Error("unexpected inference");
      },
    },
  );
  await assert.rejects(
    async () =>
      api.generateWeeklyDraft(
        { key: "test", model: "chosen-model" },
        {
          week: "2026-W42",
          start: "2026-10-12",
          end: "2026-10-18",
          sources: [],
          missing: [],
        },
      ),
    /API generation is disabled/,
  );
  await assert.rejects(
    async () =>
      api.generateDailyDraft(
        { key: "test", model: "chosen-model" },
        {
          day: "2026-10-19",
          kind: "morning",
          tasks: { active: [], completed: [] },
          previousCloseout: null,
          notes: "",
        },
      ),
    /API generation is disabled/,
  );
  assert.equal(calls, 0);
});
test("OAuth does not store a wrong-account credential when the actual Daily hub cannot be read", async () => {
  const saved: string[] = [];
  const pending = {
    state: "valid-state",
    verifier: "test",
    clientId: "test-client",
    callback: "https://admin.whatelz.ai/api/admin/daily/emdee/callback",
    created: Date.now(),
    parentPath: paths.DAILY_PARENT,
  };
  const api = load(
    "lib/daily/oauth.ts",
    {
      "next/headers": {},
      "./connections": {
        readConnection: async () => pending,
        storeConnection: async (_owner: string, provider: string) => {
          saved.push(provider);
        },
      },
      "./emdee-client": {
        emdeeCall: async () => {
          throw Error("no such doc");
        },
      },
    },
    {
      fetch: async () =>
        Response.json({ access_token: "test-token", expires_in: 3600 }),
    },
  );
  await assert.rejects(
    async () =>
      api.finishEmdeeConnection(
        OWNER,
        new URL(pending.callback + "?state=valid-state&code=test-code"),
      ),
    /no such doc/,
  );
  assert.equal(saved.length, 0);
});
test("a disabled weekly job checks the owner but reserves no run and accesses no provider", async () => {
  const api = load(
    "lib/daily/weekly.ts",
    {
      "@/lib/supabase-server": {
        supabaseAdmin: {
          from: (table: string) => {
            assert.equal(table, "users");
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { id: OWNER, role: "admin" },
                    error: null,
                  }),
                }),
              }),
            };
          },
        },
      },
      "@/lib/admin-policy": { isOwnerUser: () => true },
      "./connections": {},
      "./emdee-client": {},
      "./model": model,
      "./weekly-model": weeklyModel,
      "./agent": {},
    },
    { process: { env: {} } },
  );
  assert.equal(await api.runWeekly(OWNER), "disabled");
});
