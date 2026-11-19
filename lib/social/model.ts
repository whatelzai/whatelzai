import { z } from "zod";
export const providerSchema = z.enum(["instagram", "linkedin"]);
export type SocialProvider = z.infer<typeof providerSchema>;
export const appSchema = z.object({
  clientId: z.string().trim().min(3).max(200),
  clientSecret: z.string().trim().min(8).max(1000),
  readPosts: z.boolean().default(false),
});
export type SocialApp = z.infer<typeof appSchema>;
export type SocialTokens = {
  accessToken: string;
  refreshToken?: string;
  issuedAt: number;
  scopes: string[];
};
export type SocialPost = {
  post_id: string;
  body: string;
  permalink: string;
  published_at: string;
};
export const SOCIAL_ORIGIN = "https://app.whatelz.ai";
export const SOCIAL_COOKIE = "__Host-fcos-social";
export function callbackUrl(provider: SocialProvider) {
  return `${SOCIAL_ORIGIN}/api/member/social/${provider}/callback`;
}
export function scopes(provider: SocialProvider, app: SocialApp) {
  return provider === "instagram"
    ? ["instagram_business_basic"]
    : ["openid", "profile", ...(app.readPosts ? ["r_member_social"] : [])];
}
export function authorizeUrl(
  provider: SocialProvider,
  app: SocialApp,
  state: string,
) {
  const url = new URL(
    provider === "instagram"
      ? "https://www.instagram.com/oauth/authorize"
      : "https://www.linkedin.com/oauth/v2/authorization",
  );
  url.search = new URLSearchParams({
    client_id: app.clientId,
    redirect_uri: callbackUrl(provider),
    response_type: "code",
    state,
    scope: scopes(provider, app).join(provider === "instagram" ? "," : " "),
    ...(provider === "instagram"
      ? { enable_fb_login: "0", force_authentication: "1" }
      : {}),
  }).toString();
  return url.toString();
}
export function safePostUrl(value: unknown, provider: SocialProvider): string {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    const host =
      provider === "instagram" ? "www.instagram.com" : "www.linkedin.com";
    return url.protocol === "https:" &&
      [host, host.slice(4)].includes(url.hostname) &&
      !url.username &&
      !url.password
      ? url.toString().slice(0, 2000)
      : "";
  } catch {
    return "";
  }
}
