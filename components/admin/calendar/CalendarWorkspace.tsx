"use client";
import { type CalendarScope } from "@/lib/admin-calendar/scope";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Network, BriefcaseBusiness, CalendarDays, X } from "lucide-react";
import Link from "@/components/admin/AdminLink";
import { adminUrl } from "@/lib/admin-url";
import { useAdminPreferences } from "@/components/admin/AdminPreferences";
import {
  calendarWeeks,
  indexCalendarEvents,
  calendarSeason,
  type AdminCalendarEvent,
} from "@/lib/admin-calendar/model";
const icons = {
  "ai-business": Bot,
  "network-marketing": Network,
  "day-job": BriefcaseBusiness,
  personal: CalendarDays,
};
const BATCH = 8;
export function CalendarWorkspace({
  events,
  unavailable,
  today,
  communityYears,
  lane = "all",
}: {
  events: AdminCalendarEvent[];
  unavailable: string[];
  today: string;
  communityYears?: string;
  lane?: CalendarScope;
}) {
  const [count, setCount] = useState(BATCH),
    [selected, setSelected] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null),
    dialog = useRef<HTMLDialogElement>(null);
  const { t, preferences } = useAdminPreferences();
  const locale = preferences.language === "zh" ? "zh-SG" : "en-SG";
  const weeks = useMemo(() => calendarWeeks(today), [today]);
  const index = useMemo(
    () =>
      indexCalendarEvents(
        events.filter((e) => lane === "all" || e.lane === lane),
        weeks[0]?.start ?? today,
      ),
    [events, lane, weeks, today],
  );
  const date = (d: string, long = false) =>
    new Date(d + "T12:00:00Z").toLocaleDateString(locale, {
      day: "numeric",
      month: long ? "long" : "short",
      year: "numeric",
      timeZone: "Asia/Singapore",
    });
  const close = () => {
    dialog.current?.close();
    setSelected(null);
  };
  useEffect(() => {
    if (selected) {
      const element = dialog.current;
      element?.showModal();
      return () => element?.close();
    }
  }, [selected]);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || count >= weeks.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting))
          setCount((n) => Math.min(n + BATCH, weeks.length));
      },
      { rootMargin: "600px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [count, weeks.length]);
  return (
    <div className="admin-calendar continuous-calendar">
      <div className="calendar-weeks">
        {weeks.slice(0, count).map((w, weekIndex) => (
          <section
            className="calendar-week"
            data-week-start={w.start}
            id={`calendar-week-${w.start}`}
            key={w.start}
            aria-label={`${date(w.start)} – ${date(w.end)}`}
          >
            <h2 className="sr-only">
              {date(w.start)} – {date(w.end)}
            </h2>
            <div className="calendar-week-grid">
              {w.days.map((day, i) =>
                day ? (
                  <button
                    type="button"
                    className="calendar-day"
                    key={day}
                    data-season={calendarSeason(day)}
                    data-month={day.slice(5, 7)}
                    data-today={day === today ? "" : undefined}
                    data-weekend={i >= 5 ? "" : undefined}
                    onClick={() => setSelected(day)}
                    aria-label={`${date(day, true)} · ${(index.get(day) ?? []).length} ${t("events")}`}
                  >
                    <span className="calendar-day-number">
                      {Number(day.slice(-2))}
                    </span>
                    {(day.slice(-2) === "01" ||
                      (weekIndex === 0 && i === 0)) && (
                      <span className="calendar-month-label">
                        {new Date(day + "T12:00:00Z").toLocaleDateString(
                          locale,
                          { month: "short", timeZone: "Asia/Singapore" },
                        )}
                      </span>
                    )}
                    <span className="calendar-day-events">
                      {(index.get(day) ?? []).slice(0, 3).map((e) => {
                        const Icon = icons[e.lane];
                        return (
                          <span
                            className="calendar-day-event"
                            data-lane={e.lane}
                            key={e.id}
                          >
                            <Icon size={13} aria-hidden="true" />
                            <span>
                              {e.time && `${e.time} `}
                              {e.title}
                            </span>
                          </span>
                        );
                      })}
                      {(index.get(day) ?? []).length > 3 && (
                        <span>+{(index.get(day) ?? []).length - 3}</span>
                      )}
                    </span>
                  </button>
                ) : (
                  <div
                    key={`blank-${i}`}
                    className="calendar-day calendar-day-outside"
                    aria-hidden="true"
                  />
                ),
              )}
            </div>
          </section>
        ))}
      </div>
      <div ref={sentinel} className="calendar-load-more">
        {count < weeks.length ? (
          <button
            type="button"
            onClick={() => setCount((n) => Math.min(n + BATCH, weeks.length))}
          >
            {t("Load more weeks")}
          </button>
        ) : (
          <p>{t("End of calendar · 31 December 2029")}</p>
        )}
      </div>
      {(unavailable.length > 0 || communityYears) && (
        <details className="calendar-source-details">
          <summary>{t("Calendar sources")}</summary>
          {unavailable.length > 0 && (
            <p role="status">
              {t("Some sources unavailable")}: {unavailable.join(", ")}.{" "}
              {t("Shown dates may be incomplete.")}
            </p>
          )}
          {communityYears && (
            <p>
              {t("Community recurrence coverage")}: {communityYears}
            </p>
          )}
        </details>
      )}
      {selected && (
        <dialog
          ref={dialog}
          className="calendar-day-dialog"
          onCancel={(e) => {
            e.preventDefault();
            close();
          }}
          aria-labelledby="calendar-day-title"
        >
          <header>
            <h2 id="calendar-day-title">{date(selected, true)}</h2>
            <button type="button" onClick={close} aria-label={t("Close")}>
              <X size={20} />
            </button>
          </header>
          <div className="calendar-day-detail">
            {(index.get(selected) ?? []).map((e) => {
              const Icon = icons[e.lane];
              return (
                <article key={e.id}>
                  <Icon size={19} />
                  <div>
                    {e.href ? (
                      <Link href={adminUrl(e.href)}>{e.title}</Link>
                    ) : (
                      <h3>{e.title}</h3>
                    )}
                    <p>
                      {e.time && `${e.time} SGT · `}
                      {e.location && e.location !== "Not supplied"
                        ? e.location
                        : ""}
                    </p>
                    <p>
                      {date(e.start)}
                      {e.end !== e.start && ` – ${date(e.end)}`}
                    </p>
                    <p>{e.status}</p>
                  </div>
                </article>
              );
            })}
            {!(index.get(selected) ?? []).length && (
              <p className="calendar-empty">
                <CalendarDays size={22} />
                {t("No recorded dates in this period.")}
              </p>
            )}
          </div>
        </dialog>
      )}
    </div>
  );
}
