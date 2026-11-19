import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-server";
import { encryptSecret, decryptSecret } from "@/lib/daily/crypto";
import { validParentPath } from "@/lib/daily/oauth";
import { emdeeCall, type Envelope } from "@/lib/daily/emdee-client";
const ORIGIN = "https://emdee.tech";
const identitySchema = z.object({
  issuer: z.literal("https://emdee.tech"),
  subject: z.string().min(1).max(200),
  vault_id: z.uuid(),
  handle: z.string().nullable(),
});
type Identity = z.infer<typeof identitySchema>;
type Credentials = { token: string; expiresAt: number; parentPath: string };
type Pending =
  | {
      stage: "oauth";
      state: string;
      verifier: string;
      clientId: string;
      callback: string;
      created: number;
      parentPath: string;
    }
  | {
      stage: "confirm";
      created: number;
      identity: Identity;
      credentials: Credentials;
    };
export async function verifiedIdentity(token: string) {
  const response = await fetch(`${ORIGIN}/api/rest/identity`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw Error(
      "EMDEE could not verify this account. Reconnect and try again.",
    );
  return identitySchema.parse(await response.json());
}
async function savePending(user: string, value: Pending) {
  const { error } = await supabaseAdmin.from("member_emdee_pending").upsert({
    user_id: user,
    encrypted_state: encryptSecret(JSON.stringify(value)),
    created_at: new Date().toISOString(),
  });
  if (error) throw Error("Connection could not be saved.");
}
export async function pendingConnection(user: string) {
  const { data, error } = await supabaseAdmin
    .from("member_emdee_pending")
    .select("encrypted_state")
    .eq("user_id", user)
    .maybeSingle();
  if (error) throw Error("Connection unavailable.");
  if (!data) return null;
  const pending = JSON.parse(decryptSecret(data.encrypted_state)) as Pending;
  if (pending.created > Date.now() || Date.now() - pending.created > 600000)
    return null;
  return { pending, ciphertext: data.encrypted_state };
}
export async function beginMemberEmdee(user: string, parentPath: string) {
  if (!validParentPath(parentPath) || parentPath.startsWith("__shared__/"))
    throw Error("Choose an existing document in your own EMDEE vault.");
  const h = await headers();
  const origin = h.get("origin");
  const allowed = [
    "https://app.whatelz.ai",
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
    process.env.VERCEL_BRANCH_URL
      ? `https://${process.env.VERCEL_BRANCH_URL}`
      : "",
  ];
  if (process.env.NODE_ENV === "development")
    allowed.push("http://app.localhost:3109");
  if (!origin || !allowed.includes(origin))
    throw Error("Open your connection on app.whatelz.ai.");
  const callback = `${origin}/api/member/emdee/callback`;
  const response = await fetch(`${ORIGIN}/oauth/register`, {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "Whatelzai Member",
      redirect_uris: [callback],
    }),
  });
  if (!response.ok) throw Error("EMDEE connection could not start.");
  const registration = z
    .object({ client_id: z.string().min(1) })
    .parse(await response.json());
  const pending: Pending = {
    stage: "oauth",
    state: randomBytes(24).toString("base64url"),
    verifier: randomBytes(32).toString("base64url"),
    clientId: registration.client_id,
    callback,
    created: Date.now(),
    parentPath,
  };
  await savePending(user, pending);
  const url = new URL(`${ORIGIN}/oauth/authorize`);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: pending.clientId,
    redirect_uri: callback,
    state: pending.state,
    code_challenge: createHash("sha256")
      .update(pending.verifier)
      .digest("base64url"),
    code_challenge_method: "S256",
    scope: "docs:read",
    resource: `${ORIGIN}/api/mcp`,
  }).toString();
  return url.toString();
}
export async function finishMemberEmdee(user: string, url: URL) {
  const record = await pendingConnection(user);
  if (
    !record ||
    record.pending.stage !== "oauth" ||
    record.pending.callback !== url.origin + url.pathname ||
    record.pending.state !== url.searchParams.get("state") ||
    !url.searchParams.get("code") ||
    url.searchParams.has("error")
  )
    throw Error("Connection expired or did not match. Start again.");
  const p = record.pending;
  // Consume once before exchanging; a new concurrent flow cannot be overwritten.
  const consumed = await supabaseAdmin
    .from("member_emdee_pending")
    .delete()
    .eq("user_id", user)
    .eq("encrypted_state", record.ciphertext)
    .select("user_id")
    .maybeSingle();
  if (consumed.error || !consumed.data)
    throw Error("Connection already used. Start again.");
  const response = await fetch(`${ORIGIN}/oauth/token`, {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: url.searchParams.get("code")!,
      client_id: p.clientId,
      redirect_uri: p.callback,
      code_verifier: p.verifier,
      resource: `${ORIGIN}/api/mcp`,
    }),
  });
  if (!response.ok) throw Error("Connection could not be completed.");
  const token = z
    .object({
      access_token: z.string().min(1),
      expires_in: z.number().positive(),
    })
    .parse(await response.json());
  const identity = await verifiedIdentity(token.access_token);
  const credentials = {
    token: token.access_token,
    expiresAt: Date.now() + token.expires_in * 1000,
    parentPath: p.parentPath,
  };
  const document = await emdeeCall<Envelope>(credentials, "get_doc", {
    path: p.parentPath,
  });
  if (!/^[a-f0-9]{16}$/.test(document.doc_content_hash))
    throw Error("That collection is not available in this vault.");
  await savePending(user, {
    stage: "confirm",
    created: Date.now(),
    identity,
    credentials,
  });
}
export async function confirmMemberEmdee(user: string) {
  const record = await pendingConnection(user);
  if (!record || record.pending.stage !== "confirm")
    throw Error("Connection expired. Start again.");
  const { identity, credentials } = record.pending;
  const fresh = await verifiedIdentity(credentials.token);
  if (
    fresh.subject !== identity.subject ||
    fresh.vault_id !== identity.vault_id
  )
    throw Error("Account changed. Start again.");
  const { data: existing, error } = await supabaseAdmin
    .from("member_emdee_links")
    .select("subject,vault_id")
    .eq("user_id", user)
    .maybeSingle();
  if (
    error ||
    (existing &&
      (existing.subject !== identity.subject ||
        existing.vault_id !== identity.vault_id))
  )
    throw Error(
      "This member already has a different vault identity. Ask Edmund to review it.",
    );
  const saved = await supabaseAdmin.from("member_emdee_links").upsert({
    user_id: user,
    ...identity,
    parent_path: credentials.parentPath,
    encrypted_credentials: encryptSecret(JSON.stringify(credentials)),
  });
  if (saved.error)
    throw Error(
      "This EMDEE account or vault is already linked, or could not be saved. Ask Edmund to review it.",
    );
  await supabaseAdmin
    .from("member_emdee_pending")
    .delete()
    .eq("user_id", user)
    .eq("encrypted_state", record.ciphertext);
}
export function allowedVaultPath(path: string, parent: string) {
  return (
    validParentPath(path) &&
    !path.startsWith("__shared__/") &&
    (path === parent ||
      path.startsWith(parent.slice(0, -3).toLowerCase() + "/"))
  );
}
export async function readMemberVault(user: string, requested?: string) {
  const { data, error } = await supabaseAdmin
    .from("member_emdee_links")
    .select("subject,vault_id,parent_path,encrypted_credentials")
    .eq("user_id", user)
    .maybeSingle();
  if (error || !data?.encrypted_credentials)
    return { available: false, reason: "No verified EMDEE connection." };
  const credentials = JSON.parse(
    decryptSecret(data.encrypted_credentials),
  ) as Credentials;
  if (credentials.expiresAt <= Date.now())
    return {
      available: false,
      reason: "EMDEE authorization expired. Reconnect.",
    };
  const path = requested || data.parent_path;
  if (
    credentials.parentPath !== data.parent_path ||
    !allowedVaultPath(path, data.parent_path)
  )
    return { available: false, reason: "Outside your chosen collection." };
  const identity = await verifiedIdentity(credentials.token);
  if (identity.subject !== data.subject || identity.vault_id !== data.vault_id)
    throw Error("EMDEE identity no longer matches. Reconnect.");
  const document = await emdeeCall<Envelope & { content?: string }>(
    credentials,
    "get_doc",
    { path, full: true },
  );
  return {
    available: true,
    path,
    hash: document.doc_content_hash,
    excerpt: JSON.stringify(document).slice(0, 9000),
    truncated: JSON.stringify(document).length > 9000,
  };
}
