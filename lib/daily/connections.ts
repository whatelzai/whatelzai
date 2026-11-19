import "server-only";
import { supabaseAdmin } from "@/lib/supabase-server";
import { decryptSecret, encryptSecret } from "./crypto";
export type Provider = "emdee" | "openai" | "emdee-pkce";
export async function readConnection<T>(
  owner: string,
  provider: Provider,
): Promise<T | null> {
  const { data, error } = await supabaseAdmin
    .from("daily_connections")
    .select("encrypted_credentials")
    .eq("owner_id", owner)
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw new Error("Your private connection could not be loaded.");
  return data
    ? (JSON.parse(decryptSecret(data.encrypted_credentials)) as T)
    : null;
}
export async function storeConnection(
  owner: string,
  provider: Provider,
  credentials: unknown,
) {
  const { error } = await supabaseAdmin.from("daily_connections").upsert({
    owner_id: owner,
    provider,
    encrypted_credentials: encryptSecret(JSON.stringify(credentials)),
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error("Your private connection could not be saved.");
}
export type EmdeeConnection = {
  token: string;
  expiresAt: number;
  parentPath: string | null;
};
export type OpenAIConnection = { key: string; model: string };
export async function emdeeConnection(owner: string) {
  const saved = await readConnection<EmdeeConnection>(owner, "emdee");
  if (saved && saved.expiresAt > Date.now()) return saved;
  return null;
}
export async function openaiConnection(owner: string) {
  const saved = await readConnection<OpenAIConnection>(owner, "openai");
  return saved;
}
