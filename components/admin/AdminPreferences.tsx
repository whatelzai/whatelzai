"use client";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  DEFAULT_PREFERENCES,
  validPreferences,
  translate,
  type AdminPreferences,
} from "@/lib/admin-preferences";
const event = "whatelz-preferences-change";
const memory = new Map<string, string>();
function subscribe(update: () => void) {
  window.addEventListener(event, update);
  window.addEventListener("storage", update);
  return () => {
    window.removeEventListener(event, update);
    window.removeEventListener("storage", update);
  };
}
const Context = createContext<{
  preferences: AdminPreferences;
  ready: boolean;
  save: (change: Partial<AdminPreferences>) => boolean;
  t: (text: string) => string;
}>({
  preferences: DEFAULT_PREFERENCES,
  ready: false,
  save: () => false,
  t: (text: string) => text,
});
export const useAdminPreferences = () => useContext(Context);
export function AdminPreferencesProvider({
  owner,
  children,
}: {
  owner: string;
  children: ReactNode;
}) {
  const key = `whatelz-admin-preferences-v1:${owner}`;
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return memory.get(key) ?? localStorage.getItem(key);
      } catch {
        return memory.get(key) ?? null;
      }
    },
    () => null,
  );
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const preferences = useMemo(() => {
    try {
      const p = JSON.parse(raw ?? "null");
      return validPreferences(p) ? p : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  }, [raw]);
  const save = (change: Partial<AdminPreferences>) => {
    const next = { ...preferences, ...change };
    if (!validPreferences(next)) return false;
    let persisted = true;
    try {
      localStorage.setItem(key, JSON.stringify(next));
      memory.delete(key);
    } catch {
      memory.set(key, JSON.stringify(next));
      persisted = false;
    }
    window.dispatchEvent(new Event(event));
    return persisted;
  };
  return (
    <Context.Provider
      value={{
        preferences,
        ready,
        save,
        t: (text) => translate(text, preferences.language),
      }}
    >
      <div
        className="admin-shell min-h-dvh"
        data-admin-theme={preferences.theme}
        data-admin-size={preferences.size}
        lang={preferences.language === "zh" ? "zh-Hans" : "en"}
      >
        {children}
      </div>
    </Context.Provider>
  );
}
export function PreferenceRows({
  includeLanguage = true,
}: {
  includeLanguage?: boolean;
}) {
  const { preferences, ready, save, t } = useAdminPreferences();
  const [notice, setNotice] = useState("");
  return (
    <section aria-label={t("Appearance")} className="divide-y divide-zinc-200">
      {(
        [
          [
            "language",
            "Language",
            [
              ["en", "English"],
              ["zh", "简体中文"],
            ],
          ],
          [
            "theme",
            "Appearance",
            [
              ["light", "Light"],
              ["dark", "Dark"],
            ],
          ],
          [
            "size",
            "Text size",
            [
              ["standard", "Standard"],
              ["large", "Large"],
              ["larger", "Larger"],
            ],
          ],
        ] as const
      )
        .filter(([key]) => includeLanguage || key !== "language")
        .map(([key, label, options]) => (
          <label
            key={key}
            className="flex min-h-20 items-center justify-between gap-4 py-4"
          >
            <span className="text-sm font-medium">{t(label)}</span>
            <select
              disabled={!ready}
              value={preferences[key]}
              onChange={(e) => {
                const persisted = save({ [key]: e.target.value });
                setNotice(
                  persisted ? "" : "Preferences saved for this session only.",
                );
              }}
              className="min-h-11 max-w-[55%] rounded-lg border border-zinc-200 bg-white px-3 text-sm"
              aria-label={t(label)}
            >
              {options.map(([value, text]) => (
                <option key={value} value={value}>
                  {t(text)}
                </option>
              ))}
            </select>
          </label>
        ))}
      {notice && (
        <p role="status" className="py-2 text-xs text-zinc-500">
          {t(notice)}
        </p>
      )}
    </section>
  );
}

export function AdminText({ text }: { text: string }) {
  const { t } = useAdminPreferences();
  return <>{t(text)}</>;
}
