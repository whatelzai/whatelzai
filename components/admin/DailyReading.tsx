"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useAdminPreferences } from "./AdminPreferences";
export function DailyReading({
  morning,
  evening,
  initial,
}: {
  morning: ReactNode;
  evening: ReactNode;
  initial: "morning" | "evening";
}) {
  const [active, setActive] = useState(initial);
  const { t } = useAdminPreferences();
  useEffect(() => {
    const select = () => {
      if (location.hash === "#morning" || location.hash === "#evening")
        setActive(location.hash.slice(1) as typeof active);
    };
    queueMicrotask(select);
    window.addEventListener("hashchange", select);
    return () => window.removeEventListener("hashchange", select);
  }, []);
  return (
    <section className="admin-daily-reader min-w-0">
      <div
        role="tablist"
        aria-label={t("Daily reading")}
        className="mb-6 flex gap-5 border-b border-zinc-200"
      >
        {(["morning", "evening"] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            id={`tab-${kind}`}
            role="tab"
            aria-selected={active === kind}
            aria-controls={kind}
            tabIndex={active === kind ? 0 : -1}
            onClick={() => {
              setActive(kind);
              history.replaceState(null, "", `#${kind}`);
            }}
            onKeyDown={(e) => {
              if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
                e.preventDefault();
                const next =
                  e.key === "Home"
                    ? "morning"
                    : e.key === "End"
                      ? "evening"
                      : active === "morning"
                        ? "evening"
                        : "morning";
                setActive(next);
                history.replaceState(null, "", `#${next}`);
                document.getElementById(`tab-${next}`)?.focus();
              }
            }}
            className={`min-h-12 border-b-2 px-1 text-sm ${active === kind ? "border-yellow-400 font-semibold text-zinc-950" : "border-transparent text-zinc-500"}`}
          >
            {t(kind === "morning" ? "Morning brief" : "Evening closeout")}
          </button>
        ))}
      </div>
      <div
        id="morning"
        role="tabpanel"
        aria-labelledby="tab-morning"
        tabIndex={0}
        hidden={active !== "morning"}
      >
        {morning}
      </div>
      <div
        id="evening"
        role="tabpanel"
        aria-labelledby="tab-evening"
        tabIndex={0}
        hidden={active !== "evening"}
      >
        {evening}
      </div>
    </section>
  );
}
