import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
import { isOwnerUser, isAdminRequest } from "../lib/admin-policy";
import { domainRoute } from "../lib/domain-routing";

const OWNER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const appOwner = { id: OWNER, role: "superadmin" };
const nodeRequire = createRequire(import.meta.url);
// Execute the actual server modules with controlled network/session dependencies.
function load(
  file: string,
  mocks: Record<string, unknown>,
  owner: string | undefined = OWNER,
) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const testModule = {
    exports: {} as Record<string, (...args: unknown[]) => unknown>,
  };
  vm.runInNewContext(
    code,
    {
      module: testModule,
      exports: testModule.exports,
      require: (name: string) =>
        name in mocks ? mocks[name] : nodeRequire(name),
      Buffer,
      process: { env: { WHATELZ_OWNER_USER_ID: owner } },
      URL,
      Headers,
      Response,
      Request,
      console,
    },
    { filename: file },
  );
  return testModule.exports;
}
function database(results: Record<string, { data: unknown; error?: unknown }>) {
  const calls: { table: string; key: string; value: unknown }[] = [];
  return {
    calls,
    client: {
      from(table: string) {
        const builder: Record<string, unknown> = {};
        for (const method of [
          "select",
          "eq",
          "is",
          "update",
          "upsert",
          "insert",
        ])
          builder[method] = (key: string, value: unknown) => {
            calls.push({ table, key, value });
            return builder;
          };
        builder.maybeSingle = async () => results[table];
        builder.single = async () => results[table];
        return builder;
      },
    },
  };
}
class MockResponse extends Response {
  cookies = { getAll: () => [], set: () => {} };
  static next() {
    return new MockResponse(null);
  }
  static rewrite(url: URL) {
    return new MockResponse(null, {
      headers: { "x-test-rewrite": url.toString() },
    });
  }
  static redirect(url: URL, status = 307) {
    return new MockResponse(null, {
      status,
      headers: { location: url.toString() },
    });
  }
  static json(body: unknown, init?: ResponseInit) {
    return new MockResponse(JSON.stringify(body), {
      ...init,
      headers: { "content-type": "application/json", ...init?.headers },
    });
  }
}
function ownerPolicy(owner: string | undefined) {
  return {
    isOwnerUser: (user: Parameters<typeof isOwnerUser>[0]) =>
      isOwnerUser(user, owner ?? ""),
    isAdminRequest,
  };
}
test("only the configured stable owner with a privileged stored role is authorized", () => {
  for (const role of ["admin", "superadmin"]) {
    assert.equal(isOwnerUser({ id: OWNER, role }, OWNER), true);
    assert.equal(isOwnerUser({ id: OTHER, role }, OWNER), false);
  }
  for (const role of ["unauthorized", "member", "manager", ""])
    assert.equal(isOwnerUser({ id: OWNER, role }, OWNER), false);
  for (const config of ["", "not-a-uuid", "owner@example.test", ` ${OWNER}`])
    assert.equal(isOwnerUser(appOwner, config), false);
  assert.equal(isOwnerUser(null, OWNER), false);
  assert.equal(
    isOwnerUser(
      { id: OTHER, role: "superadmin", ...{ user_metadata: { owner: OWNER } } },
      OWNER,
    ),
    false,
  );
});
test("API gates recognize admin paths on every host without classifying member paths as admin", () => {
  for (const path of [
    "/admin",
    "/admin/team",
    "/api/admin",
    "/api/admin/tokens",
  ])
    assert.equal(isAdminRequest("public", path), true);
  assert.equal(isAdminRequest("admin", "/team"), true);
  for (const path of [
    "/team",
    "/leads",
    "/calendar",
    "/administrator",
    "/api/administrator",
  ])
    assert.equal(isAdminRequest("app", path), false);
});
async function proxyResult({
  host = "admin.whatelz.ai",
  path = "/team",
  method = "GET",
  signedIn = true,
  owner = OWNER as string | undefined,
  account = appOwner as typeof appOwner | null,
  error = null as unknown,
  confirmed = true,
  assigned = true,
  assignmentError = false,
} = {}) {
  const db = database({ users: { data: account, error } });
  const exports = load(
    "proxy.ts",
    {
      "@supabase/ssr": {
        createServerClient: () => ({
          auth: {
            getUser: async () => ({
              data: {
                user: signedIn
                  ? {
                      id: "auth-provider-id",
                      email_confirmed_at: confirmed ? "2026-10-19" : null,
                      user_metadata: { role: "superadmin", id: OWNER },
                    }
                  : null,
              },
            }),
          },
        }),
      },
      "next/server": { NextResponse: MockResponse },
      "@/lib/auth/redirect": { authCookieOptions: () => ({}) },
      "@/lib/admin-policy": ownerPolicy(owner),
      "@/lib/supabase-server": { supabaseAdmin: db.client },
      "@/lib/domain-routing": { domainRoute },
      "@/lib/team-assignment": {
        hasTeamAssignment: async () => {
          if (assignmentError) throw Error("Assignment unavailable");
          return assigned;
        },
      },
    },
    owner,
  );
  const request = {
    url: `https://${host}${path}`,
    headers: new Headers({ host }),
    nextUrl: new URL(`https://${host}${path}`),
    method,
    cookies: { getAll: () => [], set: () => {} },
  };
  return {
    response: (await exports.default(request)) as Response,
    calls: db.calls,
  };
}
test("proxy denies other admins on GET, HEAD, RSC-style POST and direct preview admin paths", async () => {
  for (const method of ["GET", "HEAD", "POST"]) {
    const { response } = await proxyResult({
      method,
      account: { id: OTHER, role: "superadmin" },
    });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  }
  assert.equal(
    (
      await proxyResult({
        host: "preview.vercel.app",
        path: "/admin/team",
        account: { id: OTHER, role: "admin" },
      })
    ).response.status,
    403,
  );
});
test("proxy fails closed for missing owner config, demotion, unverified sessions and lookup errors", async () => {
  assert.equal((await proxyResult({ owner: "" })).response.status, 403);
  assert.equal(
    (await proxyResult({ account: { id: OWNER, role: "unauthorized" } }))
      .response.status,
    403,
  );
  assert.equal((await proxyResult({ account: null })).response.status, 403);
  assert.equal(
    (await proxyResult({ error: { message: "lookup failed" } })).response
      .status,
    403,
  );
  assert.equal((await proxyResult({ confirmed: false })).response.status, 307);
  assert.equal((await proxyResult({ signedIn: false })).response.status, 307);
});
test("owner session is mapped through supabase_auth_user_id before admin rewrite", async () => {
  const { response, calls } = await proxyResult();
  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("x-test-rewrite"),
    "https://admin.whatelz.ai/admin/team",
  );
  assert.ok(
    calls.some(
      (c) =>
        c.key === "supabase_auth_user_id" && c.value === "auth-provider-id",
    ),
  );
});
test("admin API paths require the owner on public and member hosts; anonymous calls get 401", async () => {
  for (const host of ["whatelz.ai", "app.whatelz.ai", "admin.whatelz.ai"])
    for (const method of ["GET", "POST"]) {
      assert.equal(
        (
          await proxyResult({
            host,
            path: "/api/admin/tokens",
            method,
            signedIn: false,
          })
        ).response.status,
        401,
      );
      assert.equal(
        (
          await proxyResult({
            host,
            path: "/api/admin/tokens",
            method,
            account: { id: OTHER, role: "admin" },
          })
        ).response.status,
        403,
      );
      assert.equal(
        (await proxyResult({ host, path: "/api/admin/tokens", method }))
          .response.status,
        200,
      );
    }
});
test("member login and shared app navigation do not require ownership", async () => {
  for (const path of ["/team", "/leads", "/calendar"])
    assert.equal(
      (
        await proxyResult({
          host: "app.whatelz.ai",
          path,
          account: { id: OTHER, role: "unauthorized" },
        })
      ).response.status,
      200,
    );
  for (const path of ["/auth/google", "/auth/callback", "/sign-in"])
    assert.equal(
      (await proxyResult({ path, signedIn: false })).response.status,
      200,
    );
});
test("session API wrapper independently denies foreign admins without invoking the handler", async () => {
  for (const account of [
    appOwner,
    { id: OTHER, role: "admin" },
    { id: OWNER, role: "unauthorized" },
    null,
  ]) {
    const db = database({ users: { data: account } });
    const exports = load("lib/auth/withAuth.ts", {
      "next/server": { NextResponse: MockResponse },
      "@/lib/auth/server": {
        auth: async () => ({ userId: account?.id ?? null }),
      },
      "./tokens": {},
      "./scopes": {},
      "./audit": {},
      "@/lib/rate-limit": {},
      "@/lib/admin-policy": ownerPolicy(OWNER),
      "@/lib/supabase-server": { supabaseAdmin: db.client },
    });
    let invoked = false;
    const wrapped = exports.withSessionAdmin(async () => {
      invoked = true;
      return new Response("ok");
    }) as (req: Request) => Promise<Response>;
    const response = await wrapped(
      new Request("https://whatelz.ai/api/admin/tokens"),
    );
    assert.equal(
      response.status,
      account === appOwner ? 200 : account ? 403 : 401,
    );
    assert.equal(invoked, account === appOwner);
  }
});
test("Server Action helper independently checks verified auth mapping and owner role", async () => {
  for (const account of [
    appOwner,
    { id: OTHER, role: "superadmin" },
    { id: OWNER, role: "unauthorized" },
  ]) {
    const db = database({ users: { data: account } });
    const exports = load("lib/users.ts", {
      "server-only": {},
      react: { cache: (fn: unknown) => fn },
      "./admin-policy": ownerPolicy(OWNER),
      "./supabase-server": { supabaseAdmin: db.client },
      "./supabase/auth-server": {
        getVerifiedAuthUser: async () => ({ id: "verified-auth-id" }),
      },
    });
    if (account === appOwner) await exports.requireAdmin();
    else
      await assert.rejects(
        async () => exports.requireAdmin(),
        /Owner access required/,
      );
    assert.ok(
      db.calls.some(
        (c) =>
          c.key === "supabase_auth_user_id" && c.value === "verified-auth-id",
      ),
    );
  }
});
test("active MCP credentials require current owner binding, stored privilege and expiry", async () => {
  const baseToken = {
    id: "token",
    user_id: OWNER,
    expires_at: null,
    scopes: ["blog:read"],
  };
  for (const [token, account, allowed] of [
    [baseToken, appOwner, true],
    [{ ...baseToken, user_id: OTHER }, { id: OTHER, role: "admin" }, false],
    [baseToken, { id: OWNER, role: "unauthorized" }, false],
    [{ ...baseToken, expires_at: "2020-01-01" }, appOwner, false],
    [baseToken, null, false],
  ] as const) {
    const db = database({
      auth_tokens: { data: token },
      users: { data: account },
    });
    const exports = load("lib/auth/tokens.ts", {
      "@/lib/admin-policy": ownerPolicy(OWNER),
      "@/lib/supabase-server": { supabaseAdmin: db.client },
    });
    assert.equal(!!(await exports.findActiveToken("whz_example")), allowed);
  }
});

test("OAuth code redemption rechecks the current owner before issuing credentials", async () => {
  const crypto = nodeRequire("node:crypto") as typeof import("node:crypto");
  const secret = "test-only-signing-secret";
  const verifier = "test-only-pkce-verifier";
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
  for (const account of [
    appOwner,
    { id: OTHER, role: "superadmin" },
    { id: OWNER, role: "unauthorized" },
    null,
  ]) {
    const db = database({
      users: { data: account },
      system_config: { data: { value: secret } },
      auth_tokens: { data: { id: "issued-token" } },
    });
    const exports = load("app/api/oauth/token/route.ts", {
      "next/server": { NextResponse: MockResponse },
      "@/lib/admin-policy": ownerPolicy(OWNER),
      "@/lib/supabase-server": { supabaseAdmin: db.client },
      "@/lib/auth/tokens": {
        generateToken: () => "whz_test_only",
        hashToken: () => "hash",
      },
      "@/lib/auth/audit": { recordAudit: async () => {} },
      "@/lib/rate-limit": { getClientIp: () => "127.0.0.1" },
      "@/lib/auth/scopes": { OWNER_SCOPE: "*" },
    });
    const payload = `${challenge}.S256.${Math.floor(Date.now() / 1000)}.${account?.id ?? OWNER}`;
    const sig = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex")
      .slice(0, 32);
    const code = `${Buffer.from(payload).toString("base64url")}.${sig}`;
    const response = (await exports.POST(
      new Request("https://whatelz.ai/api/oauth/token", {
        method: "POST",
        body: new URLSearchParams({ code, code_verifier: verifier }),
      }),
    )) as Response;
    assert.equal(response.status, account === appOwner ? 200 : 401);
    assert.equal(
      db.calls.some((c) => c.table === "auth_tokens"),
      account === appOwner,
    );
  }
});

test("legacy MCP rejects unbound secrets and narrow credentials; owner full-scope tokens work", async () => {
  const file = "app/api/mcp/function/route.ts";
  const imports = ts.preProcessFile(
    readFileSync(new URL(`../${file}`, import.meta.url), "utf8"),
  ).importedFiles;
  const mocks: Record<string, unknown> = Object.fromEntries(
    imports.map((i) => [i.fileName, {}]),
  );
  for (const [bearer, credential, expected] of [
    ["old-shared-secret", null, 401],
    ["whz_scoped", { scopes: ["blog:read"] }, 401],
    ["whz_owner", { scopes: ["*"] }, 200],
  ] as const) {
    const exports = load(file, {
      ...mocks,
      "next/server": { NextResponse: MockResponse },
      "@/lib/auth/tokens": { findActiveToken: async () => credential },
      "@/lib/auth/scopes": { OWNER_SCOPE: "*" },
    });
    const response = (await exports.POST(
      new Request("https://whatelz.ai/api/mcp/function", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${bearer}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" }),
      }),
    )) as Response;
    assert.equal(response.status, expected);
  }
});

test("unassigned app users see a pending page and cannot execute page actions", async () => {
  for (const path of ["/", "/leads", "/calendar", "/profile", "/resources"]) {
    const { response } = await proxyResult({
      host: "app.whatelz.ai",
      path,
      assigned: false,
    });
    assert.equal(response.status, 307);
    assert.equal(
      response.headers.get("location"),
      "https://app.whatelz.ai/pending-assignment",
    );
  }
  for (const path of ["/leads", "/pending-assignment"])
    assert.equal(
      (
        await proxyResult({
          host: "app.whatelz.ai",
          path,
          method: "POST",
          assigned: false,
        })
      ).response.status,
      403,
    );
  assert.equal(
    (
      await proxyResult({
        host: "app.whatelz.ai",
        path: "/pending-assignment",
        assigned: false,
      })
    ).response.status,
    200,
  );
  assert.equal(
    (
      await proxyResult({
        host: "app.whatelz.ai",
        path: "/leads",
        assignmentError: true,
      })
    ).response.status,
    503,
  );
});
