"use client";
import { useState } from "react";
import {
  Bot,
  Network,
  BriefcaseBusiness,
  Sun,
  CalendarDays,
  Play,
  Square,
} from "lucide-react";
import Link from "./AdminLink";
import { adminUrl } from "@/lib/admin-url";
import { workLanes } from "@/lib/admin-week";
import {
  focusPath,
  focusHorizons,
  type FocusItem,
} from "@/lib/admin-focus/model";
import type { Task } from "@/lib/daily/model";
import type { AdminCalendarEvent } from "@/lib/admin-calendar/model";
import { TodayFocusCarousel } from "./TodayFocusCarousel";
import { useAdminPreferences } from "./AdminPreferences";
const icons = {
  "ai-business": Bot,
  "network-marketing": Network,
  "day-job": BriefcaseBusiness,
  personal: CalendarDays,
  administration: CalendarDays,
};
export function WorkspaceFocusView({
  tasks,
  events,
  unavailable,
  day,
  lane,
}: {
  tasks: Task[] | null;
  events: AdminCalendarEvent[];
  unavailable: string[];
  day: string;
  lane?: Task["lane"];
}) {
  const { t, preferences } = useAdminPreferences();
  const [focused, setFocused] = useState<string | null>(null);
  const horizons = focusHorizons(tasks, events, day, lane);
  const date = (d: string) =>
    new Date(d + "T12:00:00Z").toLocaleDateString(
      preferences.language === "zh" ? "zh-SG" : "en-SG",
      { day: "numeric", month: "short", timeZone: "Asia/Singapore" },
    );
  const warnings = unavailable.filter(
    (s) =>
      !lane ||
      (lane === "personal"
        ? false
        : lane === "ai-business"
          ? s === "AI events"
          : lane === "day-job"
            ? s === "Company sprints"
            : s !== "AI events" && s !== "Company sprints"),
  );
  function row(item: FocusItem) {
    const Icon = icons[item.lane];
    return (
      <li
        key={item.id}
        data-lane={item.lane}
        data-focused={focused === item.id || undefined}
      >
        <Icon size={20} aria-hidden="true" />
        <Link
          href={adminUrl(focusPath(item.id, "week", lane))}
          className="horizon-item-copy"
        >
          <strong>{item.title}</strong>
          <small>
            {item.time && `${item.time} · `}
            {date(item.start)}
            {item.end !== item.start && `–${date(item.end)}`} ·{" "}
            {t(
              item.status.startsWith("Imported event")
                ? "Calendar"
                : item.status,
            )}
            {!lane &&
              ` · ${t(workLanes.find((l) => l.lane === item.lane)?.label ?? "Administration")}`}
          </small>
        </Link>
        {item.kind === "task" &&
          item.status !== "Blocked" &&
          item.status !== "Waiting" && (
            <button
              type="button"
              aria-label={
                t(
                  focused === item.id
                    ? "Leave focus view"
                    : "Start focused sprint",
                ) +
                ": " +
                item.title
              }
              aria-pressed={focused === item.id}
              onClick={() => setFocused(focused === item.id ? null : item.id)}
            >
              {focused === item.id ? <Square size={16} /> : <Play size={16} />}
            </button>
          )}
      </li>
    );
  }
  function list(items: FocusItem[]) {
    return (
      <>
        <ul>{items.slice(0, 3).map(row)}</ul>
        {items.length > 3 && (
          <details>
            <summary>
              {t("View more")} · {items.length - 3}
            </summary>
            <ul>{items.slice(3).map(row)}</ul>
          </details>
        )}
      </>
    );
  }
  return (
    <div className="workspace-horizons">
      <section id="today-focus" aria-label={t("Today’s focus")}>
        <header>
          <h2>
            <Sun size={18} aria-hidden="true" />
            {t("Today’s focus")}
          </h2>
          <span>{date(day)}</span>
        </header>
        {horizons.today.length ? (
          <TodayFocusCarousel items={horizons.today} lane={lane} />
        ) : (
          <p className="horizon-empty">
            {t(
              tasks === null || warnings.length
                ? "Focus may be incomplete."
                : "Nothing scheduled for today.",
            )}
          </p>
        )}
      </section>
      <section id="week-focus" aria-label={t("This week’s focus")}>
        <header>
          <h2>
            <CalendarDays size={18} aria-hidden="true" />
            {t("This week’s focus")}
          </h2>
          <span>
            {date(horizons.week.start)}–{date(horizons.week.end)}
          </span>
        </header>
        {horizons.weekly.length ? (
          list(horizons.weekly)
        ) : (
          <p className="horizon-empty">
            {t(
              tasks === null || warnings.length
                ? "Focus may be incomplete."
                : "No upcoming items this week.",
            )}
          </p>
        )}
      </section>
      {(tasks === null || warnings.length > 0) && (
        <footer>
          {tasks === null && (
            <p role="status">{t("Your commitments could not be loaded.")}</p>
          )}
          {warnings.length > 0 && (
            <p role="status">
              {t("Some sources unavailable")}: {warnings.join(", ")}
            </p>
          )}
        </footer>
      )}
    </div>
  );
}
