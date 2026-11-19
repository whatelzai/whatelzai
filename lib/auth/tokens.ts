import { isOwnerUser } from "@/lib/admin-policy";
import { createHash, randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-server";
import type { RateLimitTier } from "@/lib/rate-limit";

export interface AuthToken {
  id: string;
  user_id: string;
  name: string;
  scopes: string[];
  rate_limit_tier: RateLimitTier;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

// 32 random bytes → 64 hex chars. Prefix helps humans spot leaked tokens.
export function generateToken(): string {
  return `whz_${randomBytes(32).toString("hex")}`;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function findActiveToken(
  token: string,
): Promise<AuthToken | null> {
  const { data } = await supabaseAdmin
    .from("auth_tokens")
    .select(
      "id, user_id, name, scopes, rate_limit_tier, expires_at, last_used_at, created_at, revoked_at",
    )
    .eq("token_hash", hashToken(token))
    .is("revoked_at", null)
    .maybeSingle();

  if (!data) return null;
  const row = data as AuthToken;
  if (row.expires_at && new Date(row.expires_at) <= new Date()) return null;
  const { data: owner, error } = await supabaseAdmin
    .from("users")
    .select("id,role")
    .eq("id", row.user_id)
    .maybeSingle();
  if (error || !isOwnerUser(owner)) return null;
  return row;
}

export async function touchTokenUsage(tokenId: string): Promise<void> {
  await supabaseAdmin
    .from("auth_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", tokenId);
}
