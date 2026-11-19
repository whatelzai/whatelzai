import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { readConnection, storeConnection } from "./connections";
import { emdeeCall, type Envelope } from "./emdee-client";
export { DAILY_PARENT } from "./paths";
export const EMDEE_ORIGIN = "https://emdee.tech";
type Pending = {
  state: string;
  verifier: string;
  clientId: string;
  callback: string;
  created: number;
  parentPath: string;
};
export function validParentPath(path: string) {
  return (
    /^[A-Za-z0-9_./-]+\.md$/.test(path) &&
    !path.split("/").some((p) => p === "." || p === "..") &&
    !path.startsWith("/")
  );
}
export async function connectionOrigin() {
  const h = await headers();
  const candidate = h.get("origin") || `https://${h.get("host")}`;
  const allowed = [
    "https://admin.whatelz.ai",
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
    process.env.VERCEL_BRANCH_URL
      ? `https://${process.env.VERCEL_BRANCH_URL}`
      : "",
  ];
  if (process.env.NODE_ENV === "development")
    allowed.push("http://localhost:3109", "http://admin.localhost:3109");
  if (!allowed.includes(candidate))
    throw new Error(
      "Open Connections on the admin domain or this deployment's preview URL.",
    );
  return candidate;
}
export async function beginEmdeeConnection(owner: string, parentPath: string) {
  if (!validParentPath(parentPath))
    throw new Error("Choose a valid EMDEE parent document path.");
  const callback = `${await connectionOrigin()}/api/admin/daily/emdee/callback`;
  const result = await fetch(`${EMDEE_ORIGIN}/oauth/register`, {
    method: "POST",
    redirect: "error",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "Whatelzai Daily",
      redirect_uris: [callback],
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!result.ok)
    throw new Error(
      "EMDEE connection could not start. Please try again later.",
    );
  const registered = await result.json();
  if (typeof registered.client_id !== "string")
    throw new Error("EMDEE returned an invalid connection.");
  const pending: Pending = {
    state: randomBytes(24).toString("base64url"),
    verifier: randomBytes(32).toString("base64url"),
    clientId: registered.client_id,
    callback,
    created: Date.now(),
    parentPath,
  };
  await storeConnection(owner, "emdee-pkce", pending);
  const scope = `docs:read docs:write:${encodeURIComponent(parentPath)} docs:write:${encodeURIComponent(parentPath.slice(0, -3).toLowerCase() + "/")}`;
  const url = new URL(`${EMDEE_ORIGIN}/oauth/authorize`);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: pending.clientId,
    redirect_uri: callback,
    state: pending.state,
    code_challenge: createHash("sha256")
      .update(pending.verifier)
      .digest("base64url"),
    code_challenge_method: "S256",
    scope,
    resource: `${EMDEE_ORIGIN}/api/mcp`,
  }).toString();
  return url.toString();
}
export async function finishEmdeeConnection(owner: string, url: URL) {
  const pending = await readConnection<Pending>(owner, "emdee-pkce");
  if (
    !pending ||
    pending.state !== url.searchParams.get("state") ||
    Date.now() - pending.created > 600000 ||
    pending.created > Date.now() ||
    pending.callback !== url.origin + url.pathname
  )
    throw new Error(
      "This connection request expired or does not match. Start again.",
    );
  const code = url.searchParams.get("code");
  if (!code || url.searchParams.has("error"))
    throw new Error("EMDEE authorization was not completed.");
  const result = await fetch(`${EMDEE_ORIGIN}/oauth/token`, {
    method: "POST",
    redirect: "error",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: pending.clientId,
      redirect_uri: pending.callback,
      code_verifier: pending.verifier,
      resource: `${EMDEE_ORIGIN}/api/mcp`,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!result.ok)
    throw new Error("EMDEE connection could not be completed. Start again.");
  const token = await result.json();
  if (
    typeof token.access_token !== "string" ||
    !Number.isFinite(token.expires_in) ||
    token.expires_in <= 0
  )
    throw new Error("EMDEE returned an invalid credential.");
  const credentials = {
    token: token.access_token,
    expiresAt: Date.now() + token.expires_in * 1000,
    parentPath: pending.parentPath,
  };
  // A valid token can belong to the wrong account. Verify the actual Daily hub
  // before replacing the working connection or reporting a successful setup.
  const parent = await emdeeCall<Envelope>(credentials, "get_doc", {
    path: pending.parentPath,
  });
  if (!/^[a-f0-9]{16}$/.test(parent.doc_content_hash))
    throw new Error("This EMDEE account could not verify the Daily hub.");
  await storeConnection(owner, "emdee", credentials);
  // Consume local state as well as the provider's single-use code.
  await storeConnection(owner, "emdee-pkce", {
    ...pending,
    state: "consumed",
    verifier: "",
    created: 0,
  });
}
