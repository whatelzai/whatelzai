import { z } from "zod";
import {
  callbackUrl,
  scopes,
  safePostUrl,
  type SocialApp,
  type SocialProvider,
  type SocialTokens,
  type SocialPost,
} from "./model";
// No caller-controlled URL or pagination URL is fetched. Never return upstream
// error bodies: those can contain tokens, app secrets or private account data.
export class SocialProviderError extends Error {
  constructor(public kind: "reconnect" | "restricted" | "failed") {
    super("Social provider request failed.");
  }
}
async function json(url: URL | string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new SocialProviderError(
      response.status === 401
        ? "reconnect"
        : response.status === 403
          ? "restricted"
          : "failed",
    );
  const raw = await response.text();
  if (raw.length > 1_000_000) throw new SocialProviderError("failed");
  try {
    return JSON.parse(raw);
  } catch {
    throw new SocialProviderError("failed");
  }
}
const tokenSchema = z.object({
  access_token: z.string().min(1).max(10000),
  expires_in: z
    .number()
    .int()
    .positive()
    .max(366 * 86400),
  refresh_token: z.string().max(10000).optional(),
  scope: z.string().optional(),
});
export async function exchange(
  provider: SocialProvider,
  app: SocialApp,
  code: string,
) {
  const form = new URLSearchParams({
    client_id: app.clientId,
    client_secret: app.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: callbackUrl(provider),
  });
  const raw = await json(
    provider === "instagram"
      ? "https://api.instagram.com/oauth/access_token"
      : "https://www.linkedin.com/oauth/v2/accessToken",
    { method: "POST", body: form },
  );
  let result;
  if (provider === "instagram") {
    const short = z
      .object({ access_token: z.string().min(1).max(10000) })
      .parse(raw.data?.length === 1 ? raw.data[0] : raw);
    const url = new URL("https://graph.instagram.com/access_token");
    url.search = new URLSearchParams({
      grant_type: "ig_exchange_token",
      client_secret: app.clientSecret,
      access_token: short.access_token,
    }).toString();
    result = tokenSchema.parse(await json(url));
  } else result = tokenSchema.parse(raw);
  const tokens: SocialTokens = {
    accessToken: result.access_token,
    issuedAt: Date.now(),
    scopes:
      result.scope?.split(/[ ,]+/).filter(Boolean) ?? scopes(provider, app),
    ...(result.refresh_token ? { refreshToken: result.refresh_token } : {}),
  };
  return {
    tokens,
    expiresAt: new Date(Date.now() + result.expires_in * 1000).toISOString(),
  };
}
export async function identity(provider: SocialProvider, tokens: SocialTokens) {
  const raw = await json(
    provider === "instagram"
      ? "https://graph.instagram.com/v25.0/me?fields=user_id,username"
      : "https://api.linkedin.com/v2/userinfo",
    { headers: { Authorization: `Bearer ${tokens.accessToken}` } },
  );
  if (provider === "instagram") {
    const user = z
      .object({
        user_id: z.union([
          z.string().regex(/^\d+$/),
          z.number().int().positive(),
        ]),
        username: z.string().min(1).max(64),
      })
      .parse(raw);
    return { id: String(user.user_id), name: user.username };
  }
  const user = z
    .object({
      sub: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
      name: z.string().max(200),
    })
    .parse(raw);
  return { id: user.sub, name: user.name };
}
export async function refresh(
  provider: SocialProvider,
  app: SocialApp,
  tokens: SocialTokens,
  expiry: string,
) {
  if (Date.parse(expiry) - Date.now() > 7 * 86400_000)
    return { tokens, expiresAt: expiry };
  let raw;
  if (provider === "instagram") {
    if (Date.parse(expiry) <= Date.now())
      throw new SocialProviderError("reconnect");
    if (Date.now() - tokens.issuedAt < 86400_000)
      return { tokens, expiresAt: expiry };
    const url = new URL("https://graph.instagram.com/refresh_access_token");
    url.search = new URLSearchParams({
      grant_type: "ig_refresh_token",
      access_token: tokens.accessToken,
    }).toString();
    raw = await json(url);
  } else if (tokens.refreshToken) {
    raw = await json("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: tokens.refreshToken,
        client_id: app.clientId,
        client_secret: app.clientSecret,
      }),
    });
  } else {
    if (Date.parse(expiry) <= Date.now())
      throw new SocialProviderError("reconnect");
    return { tokens, expiresAt: expiry };
  }
  const data = tokenSchema.parse(raw);
  return {
    tokens: {
      ...tokens,
      accessToken: data.access_token,
      issuedAt: Date.now(),
      refreshToken: data.refresh_token ?? tokens.refreshToken,
    },
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  };
}
export async function recentPosts(
  provider: SocialProvider,
  accountId: string,
  tokens: SocialTokens,
): Promise<SocialPost[]> {
  if (provider === "linkedin" && !tokens.scopes.includes("r_member_social"))
    throw new SocialProviderError("restricted");
  const url = new URL(
    provider === "instagram"
      ? `https://graph.instagram.com/v25.0/${encodeURIComponent(accountId)}/media`
      : "https://api.linkedin.com/rest/posts",
  );
  url.search = new URLSearchParams(
    provider === "instagram"
      ? { fields: "id,caption,permalink,timestamp", limit: "25" }
      : {
          q: "author",
          author: `urn:li:person:${accountId}`,
          count: "25",
          sortBy: "LAST_MODIFIED",
          viewContext: "READER",
        },
  ).toString();
  const raw = await json(url, {
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
      ...(provider === "linkedin"
        ? {
            "Linkedin-Version": "202608",
            "X-Restli-Protocol-Version": "2.0.0",
            "X-RestLi-Method": "FINDER",
          }
        : {}),
    },
  });
  const list = z
    .array(z.record(z.string(), z.unknown()))
    .max(100)
    .parse(provider === "instagram" ? raw.data : raw.elements);
  return list
    .filter(
      (x) =>
        provider === "instagram" ||
        (x.author === `urn:li:person:${accountId}` &&
          x.lifecycleState === "PUBLISHED"),
    )
    .slice(0, 25)
    .map((x) => {
      const id = z.string().min(1).max(200).parse(x.id);
      const body = z
        .string()
        .max(12000)
        .parse((provider === "instagram" ? x.caption : x.commentary) ?? "");
      const timestamp =
        provider === "instagram"
          ? z.string().parse(x.timestamp)
          : z.number().parse(x.publishedAt);
      const date = new Date(timestamp);
      if (!Number.isFinite(date.getTime()))
        throw new SocialProviderError("failed");
      return {
        post_id: id,
        body,
        permalink: safePostUrl(
          provider === "instagram"
            ? x.permalink
            : `https://www.linkedin.com/feed/update/${encodeURIComponent(id)}/`,
          provider,
        ),
        published_at: date.toISOString(),
      };
    });
}
