"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { adminUrl } from "@/lib/admin-url";
import { adminFocusSpaces, cleanAdminPath } from "@/lib/admin-navigation";
import {
  DEFAULT_FOCUS,
  normalizeFocusSettings,
  canAutoSwitch,
  focusAt,
  rootSpace,
  validFocusSettings,
  type FocusSettings,
  type ScheduledFocus,
} from "@/lib/admin-focus";

const changed = "whatelz-focus-change";
const volatile = new Map<string, string>();
function subscribe(callback: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key) volatile.delete(event.key);
    else volatile.clear();
    callback();
  };
  window.addEventListener("storage", storage);
  window.addEventListener(changed, callback);
  return () => {
    window.removeEventListener("storage", storage);
    window.removeEventListener(changed, callback);
  };
}
function read(key: string) {
  try {
    return volatile.get(key) ?? window.localStorage.getItem(key) ?? null;
  } catch {
    return volatile.get(key) ?? null;
  }
}
function write(key: string, value: string) {
  let persisted = true;
  try {
    window.localStorage.setItem(key, value);
    volatile.delete(key);
  } catch {
    persisted = false;
    volatile.set(key, value);
    /* Session-only fallback when storage is unavailable. */
  }
  window.dispatchEvent(new Event(changed));
  return persisted;
}
const mounted = () => true,
  serverMounted = () => false,
  emptySubscribe = () => () => {};
type Override = { key: string; space: string };
type FocusContextValue = {
  settings: FocusSettings;
  ready: boolean;
  pushSync: "checking" | "synced" | "off" | "error";
  block: ScheduledFocus | null;
  manual: Override | null;
  save: (settings: FocusSettings) => boolean;
  manualPath: (path: string) => void;
  follow: () => void;
};
const FocusContext = createContext<FocusContextValue | null>(null);
export const useAdminFocus = () => useContext(FocusContext);

export function AdminFocusProvider({
  owner,
  children,
}: {
  owner: string;
  children: ReactNode;
}) {
  const router = useRouter(),
    pathname = usePathname();
  const storageKey = `whatelz-admin-focus-v1:${owner}`;
  const overrideKey = `${storageKey}:override`;
  const ready = useSyncExternalStore(emptySubscribe, mounted, serverMounted);
  const raw = useSyncExternalStore(
    subscribe,
    () => read(storageKey),
    () => null,
  );
  const settings = useMemo(() => {
    try {
      const value = JSON.parse(raw ?? "null");
      return validFocusSettings(value)
        ? normalizeFocusSettings(value)
        : DEFAULT_FOCUS;
    } catch {
      return DEFAULT_FOCUS;
    }
  }, [raw]);
  const [pushSync, setPushSync] = useState<
    "checking" | "synced" | "off" | "error"
  >("checking");
  const [block, setBlock] = useState<ScheduledFocus | null>(null),
    [manual, setManual] = useState<Override | null>(null),
    [pending, setPending] = useState<ScheduledFocus | null>(null);
  const currentPath = useRef(pathname),
    dirty = useRef(false),
    manualRef = useRef<Override | null>(null),
    initialized = useRef(false),
    lastBlock = useRef(""),
    navigating = useRef<string | null>(null),
    waiting = useRef<{ block: ScheduledFocus; initial: boolean } | null>(null);
  useEffect(() => {
    currentPath.current = pathname;
    dirty.current = false;
    navigating.current = null;
  }, [pathname]);
  const syncQueue = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    if (!ready) return;
    let active = true;
    let running = false;
    async function sync() {
      if (running) return;
      running = true;
      try {
        if (
          !("serviceWorker" in navigator) ||
          !("Notification" in window) ||
          Notification.permission !== "granted"
        ) {
          if (active) setPushSync("off");
          return;
        }
        const registration = await navigator.serviceWorker.getRegistration("/");
        const subscription = await registration?.pushManager?.getSubscription();
        if (!subscription) {
          if (active) setPushSync("off");
          return;
        }
        const response = await fetch("/api/admin/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "focus",
            endpoint: subscription.endpoint,
            focus: settings,
          }),
        });
        if (!response.ok) throw Error("sync_failed");
        const result = await response.json();
        if (active) setPushSync(result.synced ? "synced" : "off");
      } catch {
        if (active) setPushSync("error");
      } finally {
        running = false;
      }
    }
    const queuedSync = () => {
      syncQueue.current = syncQueue.current.then(async () => {
        if (active) await sync();
      });
    };
    queuedSync();
    window.addEventListener("online", queuedSync);
    window.addEventListener("focus", queuedSync);
    window.addEventListener("whatelz-push-change", queuedSync);
    return () => {
      active = false;
      window.removeEventListener("online", queuedSync);
      window.removeEventListener("focus", queuedSync);
      window.removeEventListener("whatelz-push-change", queuedSync);
    };
  }, [ready, settings]);
  const save = useCallback(
    (next: FocusSettings) => {
      return (
        validFocusSettings(next) && write(storageKey, JSON.stringify(next))
      );
    },
    [storageKey],
  );
  const remember = useCallback(
    (value: Override | null) => {
      manualRef.current = value;
      setManual(value);
      try {
        if (value) sessionStorage.setItem(overrideKey, JSON.stringify(value));
        else sessionStorage.removeItem(overrideKey);
      } catch {
        /* Memory remains available. */
      }
    },
    [overrideKey],
  );
  const move = useCallback(
    (next: ScheduledFocus) => {
      setPending(null);
      waiting.current = null;
      if (
        cleanAdminPath(currentPath.current) === cleanAdminPath(next.path) ||
        navigating.current === next.path
      )
        return;
      navigating.current = next.path;
      router.replace(adminUrl(next.path));
    },
    [router],
  );
  const manualPath = useCallback(
    (path: string) => {
      const space = rootSpace(path);
      if (!space) {
        waiting.current = null;
        setPending(null);
        return;
      }
      const next = focusAt(new Date(), settings);
      waiting.current = null;
      remember({ key: next.key, space });
      setPending(null);
      if (settings.override === "manual") save({ ...settings, enabled: false });
    },
    [settings, remember, save],
  );
  const follow = useCallback(() => {
    remember(null);
    dirty.current = false;
    save({ ...settings, enabled: true });
    move(focusAt(new Date(), settings));
  }, [settings, remember, save, move]);
  useEffect(() => {
    const back = () => manualPath(location.pathname);
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, [manualPath]);
  useEffect(() => {
    if (!ready) return;
    let active = true,
      timer: ReturnType<typeof setTimeout>;
    const input = (event: Event) => {
      if (
        event.target instanceof Element &&
        event.target.closest(
          '#admin-main form, #admin-main [contenteditable="true"]',
        )
      )
        dirty.current = true;
    };
    const reset = () => {
      dirty.current = false;
    };
    function tick() {
      if (!active) return;
      clearTimeout(timer);
      const next = focusAt(new Date(), settings);
      setBlock((previous) => (previous?.key === next.key ? previous : next));
      const initial = !initialized.current;
      if (initial) {
        initialized.current = true;
        try {
          const prior = JSON.parse(
            sessionStorage.getItem(overrideKey) ?? "null",
          );
          if (
            prior?.key === next.key &&
            adminFocusSpaces.some((item) => item.label === prior.space)
          ) {
            manualRef.current = prior;
            setManual(prior);
          }
        } catch {
          /* No saved override. */
        }
      }
      const boundary = lastBlock.current !== next.key;
      lastBlock.current = next.key;
      if (manualRef.current && manualRef.current.key !== next.key)
        remember(null);
      if (
        settings.enabled &&
        !manualRef.current &&
        (initial || boundary || waiting.current?.block.key === next.key)
      ) {
        const editing =
          document.activeElement instanceof Element &&
          !!document.activeElement.closest(
            'input, textarea, select, [contenteditable="true"]',
          );
        const safe = canAutoSwitch({
          path: currentPath.current,
          initial: initial || Boolean(waiting.current?.initial),
          standalone:
            matchMedia("(display-mode: standalone)").matches ||
            Boolean(
              (navigator as Navigator & { standalone?: boolean }).standalone,
            ),
          hash: location.hash,
          dirty: dirty.current,
          editing,
          dialog: !!document.querySelector(
            "dialog[open], [role=dialog][aria-modal=true], header details[open], [data-focusing=true]",
          ),
          visible: document.visibilityState === "visible",
        });
        if (safe) move(next);
        else if (
          !initial ||
          (!location.hash && cleanAdminPath(currentPath.current) === "/") ||
          (cleanAdminPath(currentPath.current) === "/today" &&
            (matchMedia("(display-mode: standalone)").matches ||
              Boolean(
                (navigator as Navigator & { standalone?: boolean }).standalone,
              )) &&
            !location.hash)
        ) {
          waiting.current = {
            block: next,
            initial: initial || Boolean(waiting.current?.initial),
          };
          setPending(next);
        }
      }
      timer = setTimeout(
        tick,
        Math.max(250, Math.min(60000, next.endsAt - Date.now() + 25)),
      );
    }
    queueMicrotask(tick);
    window.addEventListener("focus", tick);
    window.addEventListener("pageshow", tick);
    document.addEventListener("visibilitychange", tick);
    document.addEventListener("input", input);
    document.addEventListener("change", input);
    document.addEventListener("reset", reset);
    return () => {
      active = false;
      clearTimeout(timer);
      window.removeEventListener("focus", tick);
      window.removeEventListener("pageshow", tick);
      document.removeEventListener("visibilitychange", tick);
      document.removeEventListener("input", input);
      document.removeEventListener("change", input);
      document.removeEventListener("reset", reset);
    };
  }, [ready, settings, overrideKey, remember, move]);
  return (
    <FocusContext.Provider
      value={{
        settings,
        ready,
        pushSync,
        block,
        manual,
        save,
        manualPath,
        follow,
      }}
    >
      {children}
      {pending && settings.enabled && !manual && (
        <aside
          role="status"
          className="fixed inset-x-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm shadow-lg lg:bottom-5"
        >
          <p>It’s time for {pending.space}. Your current page is kept open.</p>
          <button
            type="button"
            onClick={follow}
            className="min-h-11 rounded-xl bg-zinc-950 px-4 text-white"
          >
            Switch now
          </button>
        </aside>
      )}
    </FocusContext.Provider>
  );
}
