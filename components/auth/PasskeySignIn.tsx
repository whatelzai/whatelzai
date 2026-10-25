"use client";
import { useState } from "react";
import { usePasskeySupport } from "./usePasskeySupport";
import { createAuthBrowserClient } from "@/lib/supabase/auth-browser";
import {
  ADMIN_PASSKEY_RP,
  passkeyDestination,
  passkeyError,
} from "@/lib/auth/passkeys";
export function PasskeySignIn({ next }: { next: string }) {
  const supported = usePasskeySupport("get");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function signIn() {
    setBusy(true);
    setError("");
    try {
      const client = createAuthBrowserClient();
      const { data, error: failure } =
        await client.auth.passkey.startAuthentication();
      if (failure || !data) throw Error(passkeyError(failure?.code));
      if (data.options.rpId !== ADMIN_PASSKEY_RP)
        throw Error("Admin passkey sign-in is not configured yet. Use Google.");
      const publicKey = PublicKeyCredential.parseRequestOptionsFromJSON(
        data.options as unknown as PublicKeyCredentialRequestOptionsJSON,
      );
      publicKey.userVerification = "required";
      const credential = (await navigator.credentials.get({
        publicKey,
      })) as PublicKeyCredential | null;
      if (!credential) throw Error("Passkey sign-in cancelled.");
      const result = await client.auth.passkey.verifyAuthentication({
        challengeId: data.challenge_id,
        credential: credential.toJSON(),
      });
      if (result.error || !result.data?.session)
        throw Error(passkeyError(result.error?.code));
      window.location.replace(
        "/auth/passkey/finish?next=" +
          encodeURIComponent(passkeyDestination(next)),
      );
    } catch (e) {
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Passkey sign-in cancelled. You can retry or use Google."
          : e instanceof Error
            ? e.message
            : "Passkey sign-in failed.",
      );
      setBusy(false);
    }
  }
  return (
    <div>
      <button
        type="button"
        disabled={!supported || busy}
        onClick={() => void signIn()}
        className="min-h-11 w-full rounded-xl border border-zinc-200 px-4 py-3 font-medium disabled:opacity-50"
      >
        {busy ? "Waiting for your device…" : "Sign in with a passkey"}
      </button>
      {!supported && (
        <p className="mt-2 text-xs text-zinc-500">
          Use an up-to-date browser with passkey support, or continue with
          Google.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-zinc-600">
          {error}
        </p>
      )}
    </div>
  );
}
