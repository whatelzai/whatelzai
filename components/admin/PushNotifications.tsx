"use client";
import Link from "@/components/admin/AdminLink";
import { useEffect, useState, useId } from "react";
import { Bell } from "lucide-react";
import { useAdminPreferences } from "./AdminPreferences";
import { useAdminFocus } from "./AdminFocus";
import { adminUrl } from "@/lib/admin-url";

type Config = {
  configured: boolean;
  publicKey: string | null;
  monitor: { checked_at: string; error_code: string | null } | null;
};
type State = {
  supported: boolean;
  iosInstall: boolean;
  permission: NotificationPermission;
  enabled: boolean;
  config: Config | null;
  error: string | null;
  errorCode?: string | null;
};
const api = "/api/admin/push";
async function post(action: string, body: Record<string, unknown>) {
  const response = await fetch(api, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  });
  const data = await response.json();
  if (!response.ok) throw Error(data.error || "Notifications are unavailable.");
  return data;
}
function keyBytes(key: string) {
  const raw = atob(key.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
async function worker() {
  const registration = await navigator.serviceWorker.register("/admin-sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  await navigator.serviceWorker.ready;
  const installing = registration.installing;
  if (installing && installing.state !== "activated") {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        installing.removeEventListener("statechange", changed);
        reject(
          Error(
            "The app update is taking longer than expected. Reopen Settings and retry.",
          ),
        );
      }, 15000);
      const changed = () => {
        if (
          installing.state === "activated" ||
          installing.state === "redundant"
        ) {
          clearTimeout(timeout);
          installing.removeEventListener("statechange", changed);
          if (installing.state === "activated") resolve();
          else reject(Error("The notification worker could not start."));
        }
      };
      installing.addEventListener("statechange", changed);
      changed();
    });
  }
  return registration;
}
export function PushNotifications({ compact = false }: { compact?: boolean }) {
  const titleId = useId();
  const focus = useAdminFocus();
  const { t } = useAdminPreferences();
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const installed =
        matchMedia("(display-mode: standalone)").matches ||
        !!(navigator as Navigator & { standalone?: boolean }).standalone;
      const ios =
        /iPhone|iPad|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const supported =
        window.isSecureContext &&
        "Notification" in window &&
        "PushManager" in window &&
        "serviceWorker" in navigator;
      const initial: State = {
        supported,
        iosInstall: ios && !installed,
        permission:
          "Notification" in window ? Notification.permission : "default",
        enabled: false,
        config: null,
        error: null,
      };
      try {
        const response = await fetch(api, { cache: "no-store" });
        if (!response.ok)
          throw Error("Notification settings could not be loaded.");
        initial.config = await response.json();
        if (supported && !initial.iosInstall) {
          const registration =
            await navigator.serviceWorker.getRegistration("/");
          const subscription =
            await registration?.pushManager.getSubscription();
          if (subscription) {
            const status = await post("status", {
              endpoint: subscription.endpoint,
            });
            initial.enabled =
              status.enabled && initial.permission === "granted";
            initial.errorCode = status.errorCode;
          }
        }
      } catch (error) {
        initial.error =
          error instanceof Error
            ? error.message
            : "Notification status is unavailable.";
      }
      if (!cancelled) setState(initial);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);
  async function enable() {
    if (!state?.config?.publicKey) return;
    setBusy(true);
    setMessage("");
    try {
      // Must happen immediately inside this tap; do not fetch/register first on iOS.
      const permission = await Notification.requestPermission();
      setState((old) => (old ? { ...old, permission } : old));
      if (permission !== "granted") {
        setMessage(
          permission === "denied"
            ? "Notifications are blocked. Allow Whatelz Admin in your device’s notification settings, then reopen the app."
            : "Permission wasn’t enabled. You can try again when you’re ready.",
        );
        return;
      }
      const registration = await worker();
      let subscription = await registration.pushManager.getSubscription();
      if (subscription && state.errorCode === "expired") {
        await subscription.unsubscribe();
        subscription = null;
      }
      const expected = keyBytes(state.config.publicKey);
      const existing = subscription?.options.applicationServerKey;
      if (
        subscription &&
        existing &&
        (existing.byteLength !== expected.byteLength ||
          !new Uint8Array(existing).every((v, i) => v === expected[i]))
      ) {
        await subscription.unsubscribe();
        subscription = null;
      }
      const created = !subscription;
      subscription ??= await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: expected,
      });
      try {
        await post("subscribe", {
          subscription: subscription.toJSON(),
          focus: focus?.settings,
        });
      } catch (error) {
        if (created) await subscription.unsubscribe();
        throw error;
      }
      setState((old) =>
        old ? { ...old, enabled: true, error: null, errorCode: null } : old,
      );
      window.dispatchEvent(new Event("whatelz-push-change"));
      setMessage("Notifications on.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not enable notifications.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function disable() {
    setBusy(true);
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await post("unsubscribe", { endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      setState((old) => (old ? { ...old, enabled: false } : old));
      window.dispatchEvent(new Event("whatelz-push-change"));
      setMessage("Notifications off.");
    } catch {
      setMessage(
        "Could not disable notifications. Please retry before closing this page.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function test() {
    setBusy(true);
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) throw Error("This device needs to be enabled again.");
      await post("test", { endpoint: subscription.endpoint });
      setMessage(
        "Test accepted by the push service. Check your notifications; device settings and Focus mode can affect delivery.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Test could not be sent.",
      );
    } finally {
      setBusy(false);
    }
  }
  const status = !state
    ? "Checking this device…"
    : state.iosInstall
      ? "Open your installed app to enable"
      : !state.supported
        ? "Not supported in this browser"
        : state.error
          ? "Status unavailable"
          : state.enabled
            ? "Enabled on this device"
            : state.permission === "denied"
              ? "Blocked in device settings"
              : "Not enabled on this device";
  return (
    <section aria-labelledby={titleId} className="admin-push-control py-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Bell
            size={18}
            aria-hidden="true"
            className="shrink-0 text-zinc-500"
          />
          <div>
            <h2
              id={titleId}
              className="admin-push-title text-sm font-semibold text-zinc-900"
            >
              {t("Push notifications")}
            </h2>
            <p className="mt-1 text-xs text-zinc-500" role="status">
              {t(busy ? "Updating…" : status)}
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-label="Push notifications"
          aria-checked={state?.enabled ?? false}
          disabled={
            busy ||
            !state ||
            !state.supported ||
            state.iosInstall ||
            Boolean(state.error) ||
            (!state.enabled &&
              (!state.config?.configured || state.permission === "denied"))
          }
          onClick={() => void (state?.enabled ? disable() : enable())}
          className={`inline-flex min-h-11 min-w-14 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900 disabled:opacity-50`}
        >
          <span
            aria-hidden="true"
            className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${state?.enabled ? "bg-yellow-300" : "bg-zinc-200"}`}
          >
            <span
              className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${state?.enabled ? "translate-x-5" : "translate-x-0"}`}
            />
          </span>
        </button>
      </div>
      {state?.error && (
        <p role="alert" className="mt-3 text-sm text-amber-800">
          {t(state.error)}
        </p>
      )}
      {state?.permission === "denied" && (
        <p className="mt-3 text-xs text-zinc-600">
          {t("Allow notifications in your phone or browser settings.")}
        </p>
      )}
      {state?.config && !state.config.configured && (
        <p className="mt-3 text-xs text-amber-800">
          {t("Push delivery is unavailable.")}
        </p>
      )}
      {state?.iosInstall && (
        <p className="mt-3 text-xs text-zinc-600">
          {t("Open the installed app to enable notifications.")}
        </p>
      )}
      {!compact && (
        <details className="mt-2 text-xs text-zinc-500">
          <summary className="flex min-h-11 cursor-pointer items-center">
            {t("Notification options")}
          </summary>
          <div className="space-y-3 pb-1 leading-5">
            <p>
              {t(
                "Saved routines and scheduled space changes. This device only.",
              )}
            </p>
            {state?.enabled && (
              <button
                type="button"
                disabled={busy}
                onClick={test}
                className="min-h-11 rounded-xl border border-zinc-200 px-4 text-zinc-900 disabled:opacity-50"
              >
                {t("Send test notification")}
              </button>
            )}
            <p>
              {t(
                "Sound: long-press a notification on your Vivo, open its notification settings and look for Sound. The available options depend on your phone and browser; custom sounds cannot be set here.",
              )}
            </p>
            {focus?.pushSync === "error" && (
              <p role="alert" className="text-amber-800">
                {t(
                  "Timetable alerts haven’t synced. Reopen Admin online to retry.",
                )}
              </p>
            )}
            {state?.config?.monitor?.error_code && (
              <p className="text-amber-800">
                {t("Routine alerts need attention.")}{" "}
                <Link
                  className="underline"
                  href={adminUrl("/admin/today/connections")}
                >
                  {t("Check connection →")}
                </Link>
              </p>
            )}
          </div>
        </details>
      )}
      {message && (
        <p role="status" className="mt-2 text-xs leading-5 text-zinc-600">
          {t(message)}
        </p>
      )}
    </section>
  );
}
