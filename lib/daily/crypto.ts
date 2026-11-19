import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
function key() {
  const value = process.env.DAILY_INTEGRATION_KEY;
  if (!value || !/^[a-f0-9]{64}$/.test(value))
    throw new Error("Private connections are not configured yet.");
  return Buffer.from(value, "hex");
}
export function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  return [
    iv.toString("hex"),
    cipher.update(value, "utf8", "hex") + cipher.final("hex"),
    cipher.getAuthTag().toString("hex"),
  ].join(":");
}
export function decryptSecret(value: string): string {
  const [iv, ciphertext, tag] = value.split(":");
  const cipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "hex"));
  cipher.setAuthTag(Buffer.from(tag, "hex"));
  return cipher.update(ciphertext, "hex", "utf8") + cipher.final("utf8");
}
