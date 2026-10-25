import { z } from "zod";
import { ensureUserRow } from "@/lib/users";
import { isOwnerUser } from "@/lib/admin-policy";
import {
  createAuthClient,
  getVerifiedAuthUser,
} from "@/lib/supabase/auth-server";
import {
  adminPasskeyOrigin,
  recentPasskeySignIn,
  ADMIN_PASSKEY_RP,
} from "@/lib/auth/passkeys";
export const dynamic = "force-dynamic";
const reply = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
async function owner() {
  const row = await ensureUserRow();
  return isOwnerUser(row) ? getVerifiedAuthUser() : null;
}
export async function GET(req: Request) {
  if (!adminPasskeyOrigin(new URL(req.url).origin))
    return reply({ error: "Admin host required." }, 403);
  const user = await owner();
  if (!user) return reply({ error: "Owner access required." }, 403);
  const client = await createAuthClient();
  const { data, error } = await client.auth.passkey.list();
  const claims = await client.auth.getClaims();
  if (error)
    return reply({ error: "Passkeys unavailable.", code: error.code }, 503);
  return reply({
    passkeys: data ?? [],
    recent: !claims.error && recentPasskeySignIn(claims.data?.claims.amr),
  });
}
const inputSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({
    action: z.literal("verify"),
    challengeId: z.uuid(),
    credential: z.object({
      id: z.string().max(4096),
      rawId: z.string().max(4096),
      type: z.literal("public-key"),
      response: z.object({
        clientDataJSON: z.string(),
        attestationObject: z.string(),
        transports: z
          .array(
            z.enum([
              "ble",
              "hybrid",
              "internal",
              "nfc",
              "usb",
              "cable",
              "smart-card",
            ]),
          )
          .optional(),
        publicKeyAlgorithm: z.number().optional(),
        publicKey: z.string().optional(),
        authenticatorData: z.string().optional(),
      }),
      clientExtensionResults: z.record(z.string(), z.unknown()).default({}),
      authenticatorAttachment: z
        .enum(["platform", "cross-platform"])
        .optional(),
    }),
  }),
]);
export async function POST(req: Request) {
  const origin = new URL(req.url).origin;
  if (
    !adminPasskeyOrigin(origin) ||
    req.headers.get("origin") !== origin ||
    !req.headers.get("content-type")?.startsWith("application/json")
  )
    return reply({ error: "Same-origin Admin request required." }, 403);
  const user = await owner();
  if (!user) return reply({ error: "Owner access required." }, 403);
  const client = await createAuthClient();
  const claims = await client.auth.getClaims();
  if (claims.error || !recentPasskeySignIn(claims.data?.claims.amr))
    return reply(
      { error: "Recent sign-in required.", code: "reauth_required" },
      403,
    );
  if (Number(req.headers.get("content-length") || 0) > 65536)
    return reply({ error: "Request too large." }, 413);
  const raw = await req.text();
  if (raw.length > 65536) return reply({ error: "Request too large." }, 413);
  let input;
  try {
    input = inputSchema.parse(JSON.parse(raw));
  } catch {
    return reply({ error: "Invalid request." }, 400);
  }
  if (input.action === "start") {
    const { data, error } = await client.auth.passkey.startRegistration();
    if (error || !data)
      return reply(
        { error: "Could not prepare passkey.", code: error?.code },
        400,
      );
    if (data.options.rp.id !== ADMIN_PASSKEY_RP)
      return reply(
        {
          error: "Admin passkey domain is not configured.",
          code: "domain_mismatch",
        },
        503,
      );
    return reply(data);
  }
  const { data, error } = await client.auth.passkey.verifyRegistration({
    challengeId: input.challengeId,
    credential: input.credential,
  });
  if (error)
    return reply(
      { error: "Passkey could not be verified.", code: error.code },
      400,
    );
  return reply({ passkey: data });
}
