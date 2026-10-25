import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
import * as policy from "../lib/auth/passkeys";
import { isOwnerUser } from "../lib/admin-policy";
const OWNER = "11111111-1111-4111-8111-111111111111";
const require = createRequire(import.meta.url);
function api(
  options: {
    owner?: boolean;
    recent?: boolean;
    rp?: string;
    claimsError?: boolean;
  } = {},
) {
  let starts = 0,
    verifies = 0,
    lists = 0;
  const passkey = {
    list: async () => {
      lists++;
      return { data: [], error: null };
    },
    startRegistration: async () => {
      starts++;
      return {
        data: {
          challenge_id: "33333333-3333-4333-8333-333333333333",
          options: { rp: { id: options.rp ?? policy.ADMIN_PASSKEY_RP } },
        },
        error: null,
      };
    },
    verifyRegistration: async () => {
      verifies++;
      return { data: { id: "new-test-passkey" }, error: null };
    },
  };
  const client = {
    auth: {
      passkey,
      getClaims: async () => ({
        data: {
          claims: {
            amr: [
              {
                method: "oauth",
                timestamp:
                  Math.floor(Date.now() / 1000) -
                  (options.recent === false ? 3600 : 0),
              },
            ],
          },
        },
        error: options.claimsError ? {} : null,
      }),
    },
  };
  const code = ts.transpileModule(
    readFileSync(
      new URL("../app/api/admin/passkeys/route.ts", import.meta.url),
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
  const m = {
    exports: {} as {
      GET: (r: Request) => Promise<Response>;
      POST: (r: Request) => Promise<Response>;
    },
  };
  const mocks: Record<string, unknown> = {
    "@/lib/users": {
      ensureUserRow: async () =>
        options.owner === false
          ? { id: "other", role: "admin" }
          : { id: OWNER, role: "superadmin" },
    },
    "@/lib/admin-policy": {
      isOwnerUser: (u: Parameters<typeof isOwnerUser>[0]) =>
        isOwnerUser(u, OWNER),
    },
    "@/lib/supabase/auth-server": {
      createAuthClient: async () => client,
      getVerifiedAuthUser: async () => ({ id: OWNER }),
    },
    "@/lib/auth/passkeys": policy,
  };
  vm.runInNewContext(code, {
    module: m,
    exports: m.exports,
    require: (n: string) => (n in mocks ? mocks[n] : require(n)),
    Request,
    Response,
    URL,
    console,
    Date,
  });
  return { ...m.exports, calls: () => ({ starts, verifies, lists }) };
}
const req = (
  body: unknown,
  origin = "https://admin.whatelz.ai",
  url = "https://admin.whatelz.ai/api/admin/passkeys",
) =>
  new Request(url, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
test("passkey domain and destinations are Admin-only, including encoded and cross-host redirects", () => {
  assert(policy.adminPasskeyOrigin("https://admin.whatelz.ai"));
  for (const origin of [
    "https://app.whatelz.ai",
    "https://whatelz.ai",
    "http://admin.whatelz.ai",
    "https://admin.whatelz.ai.attacker.test",
  ])
    assert(!policy.adminPasskeyOrigin(origin));
  assert.equal(
    policy.passkeyDestination("/day-job?x=1#work"),
    "/day-job?x=1#work",
  );
  for (const dest of [
    "https://app.whatelz.ai/",
    "//evil.test",
    "/auth/callback",
    "/api/admin/push",
    "/sign-in",
    "https://user:password@admin.whatelz.ai/",
    "\\evil.test",
  ])
    assert.equal(policy.passkeyDestination(dest), "/");
});
test("recent authentication uses signed session AMR time, not refreshed JWT issue time or user-global sign-in", () => {
  const now = Date.parse("2026-10-26T02:00:00Z");
  const fresh = { method: "oauth", timestamp: now / 1000 - 60 };
  assert(policy.recentPasskeySignIn([fresh], now));
  for (const amr of [
    undefined,
    [],
    [{ ...fresh, timestamp: now / 1000 - 601 }],
    [{ ...fresh, timestamp: now / 1000 + 60 }],
    [{ ...fresh, method: "anonymous" }],
    [{ ...fresh, timestamp: "fresh" }],
  ])
    assert(!policy.recentPasskeySignIn(amr, now));
});
test("enrollment rejects member/preview origins, cross-origin requests and non-owner admins before calling provider", async () => {
  const a = api();
  assert.equal(
    (await a.POST(req({ action: "start" }, "https://app.whatelz.ai"))).status,
    403,
  );
  assert.equal(
    (
      await a.POST(
        req(
          { action: "start" },
          "https://app.whatelz.ai",
          "https://app.whatelz.ai/api/admin/passkeys",
        ),
      )
    ).status,
    403,
  );
  const b = api({ owner: false });
  assert.equal((await b.POST(req({ action: "start" }))).status, 403);
  assert.equal(
    (await b.GET(new Request("https://admin.whatelz.ai/api/admin/passkeys")))
      .status,
    403,
  );
  assert.equal(a.calls().starts + b.calls().starts + b.calls().lists, 0);
});
test("stale or unverifiable session cannot register; listing remains owner-only and private", async () => {
  for (const a of [api({ recent: false }), api({ claimsError: true })]) {
    assert.equal((await a.POST(req({ action: "start" }))).status, 403);
    assert.equal(a.calls().starts, 0);
  }
  const a = api({ recent: false });
  const response = await a.GET(
    new Request("https://admin.whatelz.ai/api/admin/passkeys"),
  );
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal((await response.json()).recent, false);
});
test("registration rejects wrong RP domain and malformed/oversized credential input", async () => {
  const a = api({ rp: "whatelz.ai" });
  assert.equal((await a.POST(req({ action: "start" }))).status, 503);
  const b = api();
  assert.equal(
    (
      await b.POST(
        req({ action: "verify", challengeId: "bad", credential: {} }),
      )
    ).status,
    400,
  );
  assert.equal(
    (await b.POST(req({ action: "start", padding: "x".repeat(70000) }))).status,
    413,
  );
  assert.equal(b.calls().verifies, 0);
});
test("fresh owner receives scoped challenge and verification delegates cryptography to Supabase", async () => {
  const a = api();
  assert.equal((await a.POST(req({ action: "start" }))).status, 200);
  const response = await a.POST(
    req({
      action: "verify",
      challengeId: "33333333-3333-4333-8333-333333333333",
      credential: {
        id: "test",
        rawId: "test",
        type: "public-key",
        response: { clientDataJSON: "test", attestationObject: "test" },
        clientExtensionResults: {},
      },
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(a.calls().verifies, 1);
});
test("post-sign-in finish independently rechecks owner and never redirects into the member app", async () => {
  const code = ts.transpileModule(
    readFileSync(
      new URL("../app/auth/passkey/finish/route.ts", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  for (const owner of [false, true]) {
    const m = { exports: {} as { GET: (r: Request) => Promise<Response> } };
    const mocks: Record<string, unknown> = {
      "next/server": {
        NextResponse: {
          redirect: (u: URL) =>
            new Response(null, {
              status: 307,
              headers: { location: u.toString() },
            }),
        },
      },
      "@/lib/users": {
        ensureUserRow: async () => ({
          id: owner ? OWNER : "other",
          role: "admin",
        }),
      },
      "@/lib/admin-policy": {
        isOwnerUser: (u: Parameters<typeof isOwnerUser>[0]) =>
          isOwnerUser(u, OWNER),
      },
      "@/lib/auth/passkeys": policy,
    };
    vm.runInNewContext(code, {
      module: m,
      exports: m.exports,
      require: (n: string) => mocks[n],
      URL,
      Response,
    });
    const response = await m.exports.GET(
      new Request(
        "https://admin.whatelz.ai/auth/passkey/finish?next=https%3A%2F%2Fapp.whatelz.ai%2F",
      ),
    );
    assert.equal(response.status, owner ? 307 : 403);
    if (owner)
      assert.equal(
        response.headers.get("location"),
        "https://admin.whatelz.ai/",
      );
  }
});
