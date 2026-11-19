"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

import { resolveTheme, THEME_STORAGE_KEY as key } from "@/lib/theme-preference";
function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}
function getSnapshot() {
  return document.documentElement.dataset.theme === "dark";
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, () => false);
  useEffect(() => {
    const storage = (event: StorageEvent) => {
      if (event.key !== key && event.key !== null) return;
      document.documentElement.dataset.theme = resolveTheme(event.newValue);
    };
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener("storage", storage);
    };
  }, []);
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => {
        const theme = dark ? "light" : "dark";
        document.documentElement.dataset.theme = theme;
        try {
          localStorage.setItem(key, theme);
        } catch {
          /* The toggle still works without storage. */
        }
      }}
    >
      <Sun className="theme-sun" size={19} aria-hidden="true" />
      <Moon className="theme-moon" size={19} aria-hidden="true" />
    </button>
  );
}
