import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const id = "00000000-0000-4000-8000-000000000010";
function fixture() {
  let calls = 0,
    lookups = 0;
  const updates: string[] = [];
  const offer = {
    id,
    target_event_id: "target",
    email: "private@example.test",
  };
  const query = {
    update() {
      updates.push("update");
      return this;
    },
    eq() {
      return this;
    },
    async is(column: string, value: unknown) {
      assert.equal(column, "claimed_at");
      assert.equal(value, null);
      return { error: null };
    },
  };
  const imports: Record<string, unknown> = {
    "next/server": {
      NextResponse: {
        json: (body: unknown, init: ResponseInit) => Response.json(body, init),
      },
    },
    "@/lib/event-return-offer/model": {
      RETURN_OFFER_COOKIE: "whatelz_feedback_return",
    },
    "@/lib/event-return-offer/server": {
      loadReturnOffer: async (token: string) => {
        lookups++;
        return token === "valid" ? offer : null;
      },
    },
    "@/lib/platform-event-registration": {
      signupHash: (value: string) => value,
    },
    "@/lib/supabase-server": {
      supabaseAdmin: {
        rpc: async (name: string) => {
          assert.equal(name, "claim_event_return_offer");
          calls++;
          return { error: null };
        },
        from: () => query,
      },
    },
    "@/lib/public-events/catalog-server": {
      loadPublicEvents: async () => [
        {
          recordId: "target",
          registrationUrl: "/events/register?event=ELZ-EVT-0010",
        },
      ],
    },
    "@/lib/rate-limit": {
      checkRateLimit: () => ({ allowed: true }),
      getClientIp: () => "127.0.0.1",
    },
  };
  const mod = { exports: {} as { POST: (r: Request) => Promise<Response> } };
  vm.runInNewContext(
    ts.transpileModule(
      readFileSync("app/api/event-return-offer/route.ts", "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
    {
      module: mod,
      exports: mod.exports,
      require: (name: string) => {
        if (!(name in imports)) throw Error(name);
        return imports[name];
      },
      Response,
    },
  );
  const request = (
    cookie: string | undefined,
    body: unknown,
    origin = "https://whatelz.ai",
  ) => {
    const r = new Request("https://whatelz.ai/api/event-return-offer", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    Object.defineProperty(r, "nextUrl", { value: new URL(r.url) });
    Object.defineProperty(r, "cookies", {
      value: { get: () => (cookie ? { value: cookie } : undefined) },
    });
    return r;
  };
  return {
    api: mod.exports,
    request,
    calls: () => calls,
    lookups: () => lookups,
    updates,
  };
}
test("shared URL/code without the HttpOnly offer capability cannot claim a discount; another offer ID cannot claim or dismiss it", async () => {
  const f = fixture();
  assert.equal(
    (
      await f.api.POST(
        f.request(
          "valid",
          { action: "claim", offerId: id },
          "https://other.example",
        ),
      )
    ).status,
    403,
  );
  assert.equal(f.lookups(), 0);
  assert.equal(
    (await f.api.POST(f.request(undefined, { action: "claim", offerId: id })))
      .status,
    409,
  );
  assert.equal(
    (
      await f.api.POST(
        f.request("valid", { action: "claim", offerId: "someone-else" }),
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await f.api.POST(
        f.request("valid", { action: "dismiss", offerId: "someone-else" }),
      )
    ).status,
    409,
  );
  assert.equal(f.calls(), 0);
  assert.equal(f.updates.length, 0);
  const r = await f.api.POST(
    f.request("valid", { action: "claim", offerId: id }),
  );
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await r.json(), {
    registrationUrl: "/events/register?event=ELZ-EVT-0010&offer=rejoin",
  });
  assert.equal(f.calls(), 1);
  const dismissed = await f.api.POST(
    f.request("valid", { action: "dismiss", offerId: id }),
  );
  assert.equal(dismissed.status, 200);
  assert.equal(f.updates.length, 1);
});
