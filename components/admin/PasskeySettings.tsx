"use client";
import { useEffect, useState } from "react";
import { usePasskeySupport } from "@/components/auth/usePasskeySupport";
import { ADMIN_PASSKEY_RP, passkeyError } from "@/lib/auth/passkeys";
import type { PasskeyListItem } from "@supabase/supabase-js";
export function PasskeySettings() {
  const [keys, setKeys] = useState<PasskeyListItem[] | null>(null),
    [recent, setRecent] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const supported = usePasskeySupport("create");
  async function load() {
    try {
      const r = await fetch("/api/admin/passkeys", { cache: "no-store" });
      const v = await r.json();
      if (!r.ok) {
        if (v.code === "reauth_required") setRecent(false);
        throw Error(passkeyError(v.code));
      }
      setKeys(v.passkeys);
      setRecent(v.recent);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Passkeys unavailable.");
    }
  }
  useEffect(() => {
    let active = true;
    fetch("/api/admin/passkeys", { cache: "no-store" })
      .then(async (r) => {
        const value = await r.json();
        if (!r.ok) throw Error(passkeyError(value.code));
        return value;
      })
      .then((value) => {
        if (active) {
          setKeys(value.passkeys);
          setRecent(value.recent);
        }
      })
      .catch((error) => {
        if (active)
          setNotice(
            error instanceof Error ? error.message : "Passkeys unavailable.",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  async function post(body: unknown) {
    const r = await fetch("/api/admin/passkeys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const v = await r.json();
    if (!r.ok) {
      if (v.code === "reauth_required") setRecent(false);
      throw Error(passkeyError(v.code));
    }
    return v;
  }
  async function add() {
    setBusy(true);
    setNotice("");
    try {
      const started = await post({ action: "start" });
      if (started.options.rp.id !== ADMIN_PASSKEY_RP)
        throw Error("Admin passkey domain is not configured.");
      const publicKey = PublicKeyCredential.parseCreationOptionsFromJSON(
        started.options,
      );
      publicKey.authenticatorSelection = {
        ...publicKey.authenticatorSelection,
        residentKey: "required",
        userVerification: "required",
      };
      const credential = (await navigator.credentials.create({
        publicKey,
      })) as PublicKeyCredential | null;
      if (!credential) throw Error("Passkey registration cancelled.");
      await post({
        action: "verify",
        challengeId: started.challenge_id,
        credential: credential.toJSON(),
      });
      setNotice("Passkey added. You can use it next time you sign in.");
      await load();
    } catch (e) {
      setNotice(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Passkey registration cancelled. Nothing was added."
          : e instanceof Error
            ? e.message
            : "Passkey could not be added.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="max-w-xl space-y-5">
      <h1>Security</h1>
      <div>
        <h2 className="text-base font-medium">Passkeys</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Sign in using your device’s fingerprint, face recognition or screen
          lock. Google remains available for recovery.
        </p>
      </div>
      {keys && (
        <ul className="divide-y divide-zinc-200">
          {keys.map((k) => (
            <li key={k.id} className="py-3 text-sm">
              <p>{k.friendly_name || "Passkey"}</p>
              <p className="mt-1 text-xs text-zinc-500">
                Added{" "}
                {new Date(k.created_at).toLocaleDateString("en-SG", {
                  timeZone: "Asia/Singapore",
                })}
              </p>
            </li>
          ))}
        </ul>
      )}
      {keys?.length === 0 && (
        <p className="text-sm text-zinc-500">No passkeys registered yet.</p>
      )}
      {!supported && (
        <p className="text-sm text-zinc-500">
          Open this page in an up-to-date browser on your phone or computer to
          add a passkey.
        </p>
      )}
      {keys && recent ? (
        <button
          type="button"
          disabled={!supported || busy}
          onClick={() => void add()}
          className="focus-primary"
        >
          {busy ? "Waiting for your device…" : "Add passkey"}
        </button>
      ) : (
        <form action="/auth/google" method="post">
          <input
            type="hidden"
            name="next"
            value="https://admin.whatelz.ai/settings/security"
          />
          <button className="focus-primary">Confirm with Google</button>
          <p className="mt-2 text-xs text-zinc-500">
            A sign-in within the last ten minutes is required to add a passkey.
          </p>
        </form>
      )}
      {notice && (
        <p role="status" className="text-sm text-zinc-600">
          {notice}
        </p>
      )}
    </section>
  );
}
