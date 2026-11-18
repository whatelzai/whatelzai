"use client";
import { useState } from "react";
import {
  Bot,
  Network,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import Link from "@/components/admin/AdminLink";
import { adminUrl } from "@/lib/admin-url";
import { useAdminPreferences } from "@/components/admin/AdminPreferences";
import {
  calendarLanes,
  period,
  shiftPeriod,
  visibleEvents,
  type AdminCalendarEvent,
  type CalendarView,
} from "@/lib/admin-calendar/model";
const icons = {
  "ai-business": Bot,
  "network-marketing": Network,
  "day-job": BriefcaseBusiness,
};
const views: CalendarView[] = ["day", "week", "month", "quarter", "year"];
export function CalendarWorkspace({
  events,
  unavailable,
  today,
  communityYears,
}: {
  events: AdminCalendarEvent[];
  unavailable: string[];
  today: string;
  communityYears?: string;
}) {
  const [view, setView] = useState<CalendarView>("week"),
    [day, setDay] = useState(today),
    [lane, setLane] = useState("all");
  const { t, preferences } = useAdminPreferences();
  const bounds = period(day, view),
    shown = visibleEvents(events, day, view, lane);
  const date = (d: string) =>
    new Date(d + "T12:00:00Z").toLocaleDateString(
      preferences.language === "zh" ? "zh-SG" : "en-SG",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Singapore",
      },
    );
  return (
    <div className="admin-calendar">
      <div className="calendar-view-tabs" aria-label={t("Calendar view")}>
        {views.map((v) => (
          <button
            type="button"
            aria-pressed={view === v}
            key={v}
            onClick={() => setView(v)}
          >
            {t(v[0].toUpperCase() + v.slice(1))}
          </button>
        ))}
      </div>
      <div className="calendar-period">
        <button
          type="button"
          aria-label={t("Previous period")}
          onClick={() => setDay(shiftPeriod(day, view, -1))}
        >
          <ChevronLeft size={20} />
        </button>
        <h2>
          {date(bounds.start)}
          {bounds.end !== bounds.start && ` – ${date(bounds.end)}`}
        </h2>
        <button
          type="button"
          aria-label={t("Next period")}
          onClick={() => setDay(shiftPeriod(day, view, 1))}
        >
          <ChevronRight size={20} />
        </button>
        <button type="button" onClick={() => setDay(today)}>
          {t("Today")}
        </button>
      </div>
      <div className="calendar-lanes" aria-label={t("Workspaces")}>
        <button
          type="button"
          aria-pressed={lane === "all"}
          onClick={() => setLane("all")}
        >
          {t("All")}
        </button>
        {calendarLanes.map((l) => {
          const Icon = icons[l.id];
          return (
            <button
              type="button"
              key={l.id}
              aria-pressed={lane === l.id}
              onClick={() => setLane(l.id)}
            >
              <Icon size={16} />
              {t(l.label)}
            </button>
          );
        })}
      </div>
      {unavailable.length > 0 && (
        <p role="status" className="calendar-source-warning">
          {t("Some sources unavailable")}: {unavailable.join(", ")}.{" "}
          {t("Shown dates may be incomplete.")}
        </p>
      )}
      <ol className="calendar-agenda">
        {shown.map((e) => {
          const Icon = icons[e.lane];
          return (
            <li key={e.id} data-lane={e.lane}>
              <div className="calendar-event-date">
                {date(e.start)}
                {e.end !== e.start && <span>– {date(e.end)}</span>}
              </div>
              <Icon
                size={19}
                aria-label={t(
                  calendarLanes.find((l) => l.id === e.lane)!.label,
                )}
              />
              <div>
                {e.href ? (
                  <Link href={adminUrl(e.href)}>{e.title}</Link>
                ) : (
                  <h3>{e.title}</h3>
                )}
                <p>
                  {e.time && `${e.time} SGT · `}
                  {e.location && e.location !== "Not supplied"
                    ? `${e.location} · `
                    : ""}
                  {e.status}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      {!shown.length && (
        <p className="calendar-empty">
          <CalendarDays size={24} />
          {t("No recorded dates in this period.")}
        </p>
      )}
      {communityYears && (
        <p className="calendar-footnote">
          {t("Community recurrence coverage")}: {communityYears}
        </p>
      )}
      <p className="calendar-footnote">
        {t("SGT · Sprint windows are planning ranges, not booked work hours.")}
      </p>
    </div>
  );
}
