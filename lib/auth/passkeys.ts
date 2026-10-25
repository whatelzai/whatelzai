export const ADMIN_PASSKEY_ORIGIN = "https://admin.whatelz.ai";
export const ADMIN_PASSKEY_RP = "admin.whatelz.ai";
export function adminPasskeyOrigin(origin: string) {
  return origin === ADMIN_PASSKEY_ORIGIN;
}
/** A recent real sign-in is needed to add a new authentication credential. */
export function recentPasskeySignIn(amr: unknown, now = Date.now()) {
  if (!Array.isArray(amr)) return false;
  return amr.some((entry) => {
    if (
      !entry ||
      !["oauth", "passkey", "webauthn"].includes(entry.method) ||
      typeof entry.timestamp !== "number"
    )
      return false;
    const time = entry.timestamp * 1000;
    return (
      Number.isFinite(time) &&
      time <= now + 30000 &&
      now - time <= 10 * 60 * 1000
    );
  });
}
export function passkeyDestination(value: string | null | undefined) {
  try {
    const u = new URL(value || "/", ADMIN_PASSKEY_ORIGIN);
    if (
      u.origin !== ADMIN_PASSKEY_ORIGIN ||
      u.username ||
      u.password ||
      u.pathname.startsWith("/auth") ||
      u.pathname.startsWith("/api") ||
      u.pathname.startsWith("/sign-in") ||
      value?.includes("\\")
    )
      return "/";
    return u.pathname + u.search + u.hash;
  } catch {
    return "/";
  }
}
export function passkeyError(code?: string) {
  if (code === "reauth_required")
    return "Confirm your Google sign-in before adding a passkey.";
  if (code === "passkey_disabled")
    return "Passkeys are not enabled yet. Google sign-in is still available.";
  if (code === "webauthn_credential_exists")
    return "This passkey is already registered.";
  if (code === "webauthn_challenge_expired")
    return "The request expired. Please try again.";
  return "Passkey request could not be completed. Please try again or use Google.";
}
