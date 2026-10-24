"use client";

import { useAdminPreferences } from "./AdminPreferences";
import { useAdminFocus } from "./AdminFocus";
import Link from "@/components/admin/AdminLink";
import { WhatelzMark } from "@/components/brand/WhatelzMark";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Check, ChevronDown, House, Settings2, UserRound } from "lucide-react";
import { adminUrl } from "@/lib/admin-url";
import { adminNavigation, adminWorkstreams } from "@/lib/admin-navigation";

const tabs = [
  {
    key: "personal",
    label: "Personal",
    path: "/admin/personal",
    icon: UserRound,
  },
  { key: "home", label: "Home", path: "/admin", icon: House },
  {
    key: "settings",
    label: "Settings",
    path: "/admin/settings",
    icon: Settings2,
  },
] as const;

export function AdminNavigation() {
  const focus = useAdminFocus();
  const { t } = useAdminPreferences();
  const pathname = usePathname();
  const current = adminNavigation(pathname);
  const switcher = useRef<HTMLDetailsElement>(null);
  const activeLabel =
    current.workstream ??
    (current.tab === "personal" ? "Personal" : "Settings");
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !switcher.current?.contains(event.target)
      ) {
        if (switcher.current) switcher.current.open = false;
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && switcher.current?.open) {
        switcher.current.open = false;
        switcher.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <>
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-yellow-300 focus:p-3"
      >
        {t("Skip to content")}
      </a>
      <header className="admin-nav-header sticky top-0 z-30 border-b border-zinc-200 bg-white/95 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 md:px-10">
          <div className="flex min-h-16 items-center justify-between gap-3">
            <Link
              href={adminUrl("/admin")}
              aria-label="Whatelz Admin overview"
              className="flex min-h-11 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FACC15] text-[#18181B]">
                <WhatelzMark className="w-8" />
              </span>
              <span className="max-[380px]:hidden">
                <span className="block text-sm font-semibold tracking-tight">
                  {t("Whatelz Admin")}
                </span>
                <span className="hidden text-[10px] uppercase sm:block tracking-[0.18em] text-zinc-500">
                  {t("Your command centre")}
                </span>
              </span>
            </Link>
            <nav
              aria-label="Desktop admin tabs"
              data-ledger-tabs=""
              className="hidden items-center gap-1 rounded-full bg-zinc-100 p-1 lg:flex"
            >
              {tabs.map(({ key, label, path, icon: Icon }) => (
                <Link
                  key={key}
                  href={adminUrl(path)}
                  aria-current={current.tab === key ? "location" : undefined}
                  className={`flex min-h-10 items-center gap-2 rounded-full px-5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 ${current.tab === key ? "bg-white text-zinc-950" : "text-zinc-500 hover:text-zinc-950"}`}
                >
                  <Icon size={17} aria-hidden="true" />
                  {t(label)}
                </Link>
              ))}
            </nav>
            {current.tab === "home" ? (
              <details
                key={pathname}
                ref={switcher}
                className="admin-space-switcher group relative shrink-0"
              >
                <summary
                  aria-label={`Choose area: ${t(activeLabel)}`}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown" && switcher.current) {
                      event.preventDefault();
                      switcher.current.open = true;
                      switcher.current
                        .querySelector<HTMLAnchorElement>("nav a")
                        ?.focus();
                    }
                  }}
                  className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full bg-yellow-300 px-4 text-sm font-medium text-zinc-950 transition hover:bg-yellow-200 focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden"
                >
                  {t(activeLabel)}
                  <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className="shrink-0 transition-transform group-open:rotate-180"
                  />
                </summary>
                <nav
                  aria-label="Admin workstreams"
                  className="absolute right-0 top-full z-50 mt-2 w-60 max-w-[calc(100vw-2rem)] rounded-2xl border border-zinc-200 bg-white p-2 text-zinc-950 shadow-xl shadow-zinc-950/10"
                >
                  {adminWorkstreams.map((item) => {
                    const active = current.workstream === item.label;
                    return (
                      <Link
                        key={item.path}
                        href={adminUrl(item.path)}
                        aria-current={active ? "location" : undefined}
                        onClick={() => {
                          if (switcher.current) {
                            switcher.current.open = false;
                            switcher.current.querySelector("summary")?.focus();
                          }
                        }}
                        className={`flex min-h-12 items-center justify-between gap-4 rounded-xl px-3 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] ${active ? "bg-yellow-100" : "hover:bg-zinc-100"}`}
                      >
                        {t(item.label)}
                        {active && <Check size={16} aria-hidden="true" />}
                      </Link>
                    );
                  })}
                  <div className="mt-1 border-t border-zinc-100 px-3 pt-3 pb-1 text-xs text-zinc-500">
                    <p>
                      {t(
                        !focus?.ready
                          ? "Checking schedule…"
                          : !focus.settings.enabled
                            ? "Automatic switching paused"
                            : focus.manual
                              ? "Manual choice · until next block"
                              : "Following your schedule",
                      )}
                    </p>
                    {focus?.ready &&
                      (!focus.settings.enabled || focus.manual) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (switcher.current) switcher.current.open = false;
                            focus.follow();
                          }}
                          className="mt-2 min-h-11 text-left font-medium text-zinc-950"
                        >
                          {t("Follow schedule now →")}
                        </button>
                      )}
                    <Link
                      href={adminUrl("/admin/settings#focus-schedule")}
                      className="mt-1 flex min-h-11 items-center text-zinc-600"
                    >
                      {t("Schedule settings →")}
                    </Link>
                  </div>
                </nav>
              </details>
            ) : (
              <span className="inline-flex min-h-11 items-center rounded-full bg-yellow-300 px-4 text-sm font-medium text-zinc-950">
                {t(activeLabel)}
              </span>
            )}
          </div>
        </div>
      </header>
      <nav
        aria-label="Admin tabs"
        data-ledger-dock=""
        className="fixed inset-x-0 bottom-0 z-40 mx-auto grid w-full max-w-lg grid-cols-3 gap-3 border-t border-zinc-200 bg-white/95 px-5 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:rounded-t-3xl sm:border-x lg:hidden"
      >
        {tabs.map(({ key, label, path, icon: Icon }) => {
          const active = current.tab === key;
          return (
            <Link
              key={key}
              href={adminUrl(path)}
              aria-current={active ? "location" : undefined}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 ${active ? "bg-yellow-300 text-zinc-950" : "text-zinc-500 hover:bg-zinc-100"}`}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2 : 1.7}
                aria-hidden="true"
              />
              {t(label)}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
