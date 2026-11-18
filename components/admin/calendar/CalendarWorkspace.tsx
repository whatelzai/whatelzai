"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Network,
  BriefcaseBusiness,
  CalendarDays,
  ArrowRight,
  X,
} from "lucide-react";
import Link from "@/components/admin/AdminLink";
import { adminUrl } from "@/lib/admin-url";
import { useAdminPreferences } from "@/components/admin/AdminPreferences";
import {
  calendarLanes,
  calendarWeeks,
  indexCalendarEvents,
  CALENDAR_END,
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
}: {
  events: AdminCalendarEvent[];
  unavailable: string[];
  today: string;
  communityYears?: string;
}) {
  const [count, setCount] = useState(BATCH),
    [lane, setLane] = useState("all"),
    [selected, setSelected] = useState<string | null>(null),
    [jump, setJump] = useState("");
  const sentinel = useRef<HTMLDivElement>(null),
    dialog = useRef<HTMLDialogElement>(null),
    dateInput = useRef<HTMLInputElement>(null);
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
  useEffect(() => {
    if (jump)
      document
        .getElementById(`calendar-week-${jump}`)
        ?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [jump]);
  function jumpTo(day: string) {
    const n = weeks.findIndex((w) => w.start <= day && w.end >= day);
    if (n < 0) return;
    setCount((current) =>
      Math.max(
        current,
        Math.min(weeks.length, Math.ceil((n + 1) / BATCH) * BATCH),
      ),
    );
    if (jump === weeks[n].start) {
      document
        .getElementById(`calendar-week-${jump}`)
        ?.scrollIntoView({ block: "start", behavior: "smooth" });
    } else setJump(weeks[n].start);
  }
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(`2026-11-${16 + i}T12:00:00Z`).toLocaleDateString(locale, {
      weekday: "short",
      timeZone: "Asia/Singapore",
    }),
  );
  return (
    <div className="admin-calendar continuous-calendar">
      <div className="calendar-scroll-tools">
        <button
          type="button"
          onClick={() => {
            setJump("");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          {t("Today")}
        </button>
        <label>
          {t("Jump to date")}
          <input
            type="date"
            ref={dateInput}
            min={weeks[0]?.start}
            max={CALENDAR_END}
            onChange={(e) => jumpTo(e.target.value)}
          />
        </label>
        <button
          type="button"
          aria-label={t("Go to date")}
          onClick={() => {
            if (dateInput.current?.value) jumpTo(dateInput.current.value);
          }}
        >
          <ArrowRight size={18} />
        </button>
        <span>{t("Through 31 Dec 2029")}</span>
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
              aria-label={t(l.label)}
              aria-pressed={lane === l.id}
              onClick={() => setLane(l.id)}
            >
              <Icon size={16} />
              <span className="calendar-lane-full">{t(l.label)}</span>
              <span className="calendar-lane-short">
                {t(
                  l.id === "ai-business"
                    ? "AI"
                    : l.id === "network-marketing"
                      ? "Network"
                      : "Work",
                )}
              </span>
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
      {communityYears && (
        <p className="calendar-footnote">
          {t("Community recurrence coverage")}: {communityYears}
        </p>
      )}
      <div className="calendar-weekdays" aria-hidden="true">
        {weekdays.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="calendar-weeks">
        {weeks.slice(0, count).map((w, weekIndex) => (
          <section
            className="calendar-week"
            id={`calendar-week-${w.start}`}
            key={w.start}
            aria-label={`${date(w.start)} – ${date(w.end)}`}
          >
            {(weekIndex === 0 ||
              weeks[weekIndex - 1].start.slice(0, 4) !== w.start.slice(0, 4) ||
              w.start.slice(0, 4) !== w.end.slice(0, 4)) && (
              <p className="calendar-year-marker">
                {w.start.slice(0, 4)}
                {w.start.slice(0, 4) !== w.end.slice(0, 4) &&
                  ` / ${w.end.slice(0, 4)}`}
              </p>
            )}
            <h2>
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
                    {day.slice(-2) === "01" && (
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
