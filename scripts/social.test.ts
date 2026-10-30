import { test } from "node:test";
import assert from "node:assert/strict";
import {
  authorizeUrl,
  callbackUrl,
  safePostUrl,
  type SocialApp,
} from "../lib/social/model";
import {
  exchange,
  identity,
  recentPosts,
  refresh,
  SocialProviderError,
} from "../lib/social/provider";
const app: SocialApp = {
  clientId: "example-client",
  clientSecret: "example-only-not-a-secret",
  readPosts: false,
};
test("read-only fixed callbacks, separate permissions and state", () => {
  const ig = new URL(authorizeUrl("instagram", app, "random-state"));
  assert.equal(ig.hostname, "www.instagram.com");
  assert.equal(ig.searchParams.get("scope"), "instagram_business_basic");
  assert.equal(ig.searchParams.get("state"), "random-state");
  assert.equal(ig.searchParams.get("redirect_uri"), callbackUrl("instagram"));
  const li = new URL(authorizeUrl("linkedin", app, "state"));
  assert.equal(li.searchParams.get("scope"), "openid profile");
  assert.match(
    authorizeUrl("linkedin", { ...app, readPosts: true }, "state"),
    /r_member_social/,
  );
  assert.doesNotMatch(li.toString(), /w_member_social/);
});
test("permalinks reject javascript, credentials and other hosts", () => {
  for (const value of [
    "javascript:alert(1)",
    "https://instagram.com.evil.test/x",
    "https://x@www.instagram.com/p/x",
    "https://www.linkedin.com/x",
  ])
    assert.equal(safePostUrl(value, "instagram"), "");
  assert.equal(
    safePostUrl("https://www.instagram.com/p/example/", "instagram"),
    "https://www.instagram.com/p/example/",
  );
});
test("provider exchange, identity, refresh and content stay bounded", async () => {
  const original = globalThis.fetch;
  const calls: { url: string; init: RequestInit }[] = [];
  let responses: unknown[] = [];
  globalThis.fetch = (async (
    input: URL | string | Request,
    init: RequestInit = {},
  ) => {
    calls.push({ url: String(input), init });
    return Response.json(responses.shift());
  }) as typeof fetch;
  try {
    responses = [
      { access_token: "short" },
      { access_token: "long", expires_in: 5184000 },
    ];
    const result = await exchange("instagram", app, "code");
    assert.equal(result.tokens.accessToken, "long");
    assert.equal(calls[0].url, "https://api.instagram.com/oauth/access_token");
    assert.equal(calls[0].init.method, "POST");
    responses = [
      { user_id: "987654321098765432", username: "example.creator" },
    ];
    assert.deepEqual(await identity("instagram", result.tokens), {
      id: "987654321098765432",
      name: "example.creator",
    });
    responses = [
      {
        data: [
          {
            id: "media-1",
            caption: "Source text, not instructions",
            timestamp: "2026-10-28T12:00:00Z",
            permalink: "https://www.instagram.com/p/example/",
          },
        ],
        paging: { next: "https://evil.test/token" },
      },
    ];
    const count = calls.length;
    const posts = await recentPosts("instagram", "987", result.tokens);
    assert.equal(posts.length, 1);
    assert.equal(calls.length, count + 1);
    assert.equal(new URL(calls.at(-1)!.url).searchParams.get("limit"), "25");
    await assert.rejects(
      () => recentPosts("linkedin", "member", result.tokens),
      (e: unknown) =>
        e instanceof SocialProviderError && e.kind === "restricted",
    );
    const before = calls.length;
    await refresh(
      "instagram",
      app,
      result.tokens,
      new Date(Date.now() + 20 * 86400_000).toISOString(),
    );
    assert.equal(calls.length, before);
    responses = [{ access_token: "renewed", expires_in: 5184000 }];
    const refreshed = await refresh(
      "instagram",
      app,
      { ...result.tokens, issuedAt: Date.now() - 2 * 86400_000 },
      new Date(Date.now() + 1000).toISOString(),
    );
    assert.equal(refreshed.tokens.accessToken, "renewed");
    responses = [
      {
        elements: [
          {
            id: "urn:li:share:1",
            author: "urn:li:person:member",
            lifecycleState: "PUBLISHED",
            publishedAt: Date.now(),
            commentary: "own",
          },
          {
            id: "urn:li:share:2",
            author: "urn:li:person:another",
            lifecycleState: "PUBLISHED",
            publishedAt: Date.now(),
            commentary: "other",
          },
        ],
      },
    ];
    assert.equal(
      (
        await recentPosts("linkedin", "member", {
          ...result.tokens,
          scopes: ["r_member_social"],
        })
      ).length,
      1,
    );
    assert.equal(calls.at(-1)!.init.redirect, "error");
  } finally {
    globalThis.fetch = original;
  }
});
test("upstream errors never leak provider error bodies", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response("sensitive-provider-content", {
      status: 403,
    })) as typeof fetch;
  try {
    await assert.rejects(
      () =>
        identity("linkedin", {
          accessToken: "fake",
          issuedAt: Date.now(),
          scopes: [],
        }),
      (e: unknown) =>
        e instanceof SocialProviderError &&
        e.kind === "restricted" &&
        !e.message.includes("sensitive"),
    );
  } finally {
    globalThis.fetch = original;
  }
});
