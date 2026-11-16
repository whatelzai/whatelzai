"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CalendarDays, List, ChevronLeft, ChevronRight } from "lucide-react";
import {
  calendarShortLabel,
  monthCells,
  monthTitle,
  shiftMonth,
  type EventBrowseItem,
} from "@/lib/public-events/calendar";
import { priceLabel } from "@/lib/public-events/catalog";
export default function EventBrowser({
  events,
  initialMonth,
  initialView,
  today,
}: {
  events: EventBrowseItem[];
  initialMonth: string;
  initialView: "list" | "calendar";
  today: string;
}) {
  const [view, setView] = useState(initialView),
    [month, setMonth] = useState(initialMonth);
  const shown = events.filter((e) => e.date.startsWith(month));
  function change(nextView: "list" | "calendar", nextMonth = month) {
    setView(nextView);
    setMonth(nextMonth);
    const url = new URL(window.location.href);
    url.searchParams.set("view", nextView);
    if (nextView === "calendar") url.searchParams.set("month", nextMonth);
    else url.searchParams.delete("month");
    window.history.replaceState(
      null,
      "",
      url.pathname + url.search + "#event-browser",
    );
  }
  return (
    <section
      id="event-browser"
      className="event-browser"
      aria-labelledby="browse-title"
    >
      <div className="event-browser-heading">
        <h2 id="browse-title">Find your next session.</h2>
        <div className="event-view-switch" aria-label="Event view">
          <button
            type="button"
            aria-pressed={view === "list"}
            onClick={() => change("list")}
          >
            <List size={18} />
            List
          </button>
          <button
            type="button"
            aria-pressed={view === "calendar"}
            onClick={() => change("calendar")}
          >
            <CalendarDays size={18} />
            Calendar
          </button>
        </div>
      </div>
      {view === "list" ? (
        <div className="event-agenda-list">
          <h3>Coming up</h3>
          {events.filter((e) => !e.past).length ? (
            events
              .filter((e) => !e.past)
              .map((e) => <EventRow key={e.id} event={e} />)
          ) : (
            <p>New sessions will appear here when they’re published.</p>
          )}
          <div id="previous-sessions">
            <h3>Previous sessions</h3>
            {events
              .filter((e) => e.past)
              .reverse()
              .map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
          </div>
        </div>
      ) : (
        <div className="event-calendar">
          <div className="event-month-nav">
            <button
              type="button"
              aria-label="Previous month"
              disabled={month <= "2000-01"}
              onClick={() => change("calendar", shiftMonth(month, -1))}
            >
              <ChevronLeft size={22} />
            </button>
            <h3 aria-live="polite">{monthTitle(month)}</h3>
            <button
              type="button"
              aria-label="Next month"
              disabled={month >= "2100-12"}
              onClick={() => change("calendar", shiftMonth(month, 1))}
            >
              <ChevronRight size={22} />
            </button>
          </div>
          <div
            className="event-month-grid"
            role="table"
            aria-label={monthTitle(month)}
          >
            <div role="row" className="event-calendar-weekdays">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <span role="columnheader" key={d}>
                  {d}
                </span>
              ))}
            </div>
            {Array.from({ length: monthCells(month).length / 7 }, (_, week) => (
              <div role="row" className="event-calendar-week" key={week}>
                {monthCells(month)
                  .slice(week * 7, week * 7 + 7)
                  .map((date, index) => (
                    <div
                      role="cell"
                      className={`event-calendar-day${date === today ? " event-calendar-today" : ""}${!date ? " event-calendar-blank" : ""}`}
                      key={date || `blank-${index}`}
                    >
                      {date && (
                        <>
                          <time
                            dateTime={date}
                            aria-label={date}
                            aria-current={date === today ? "date" : undefined}
                          >
                            {Number(date.slice(-2))}
                          </time>
                          {shown
                            .filter((e) => e.date === date)
                            .map((e) => (
                              <Link
                                href={e.path}
                                key={e.id}
                                aria-label={`${e.title} — ${e.dateLabel}`}
                                className={`event-calendar-session${e.format === "intensive" ? " event-calendar-intensive" : ""}`}
                              >
                                <span className="event-calendar-full">
                                  {e.title}
                                </span>
                                <span
                                  className="event-calendar-short"
                                  aria-hidden="true"
                                >
                                  {calendarShortLabel(e)}
                                </span>
                                <small>
                                  {e.format === "intensive"
                                    ? "Intensive"
                                    : e.format === "sharing"
                                      ? "Sharing"
                                      : "Weekly"}
                                </small>
                              </Link>
                            ))}
                        </>
                      )}
                    </div>
                  ))}
              </div>
            ))}
          </div>
          <p className="event-calendar-legend">
            AI = AI Skillset · MM = Money Mindset · AMI = AI Money Intensive
          </p>
          <div className="event-month-agenda" aria-live="polite">
            <h4>In {monthTitle(month)}</h4>
            {shown.length ? (
              shown.map((e) => <EventRow key={e.id} event={e} />)
            ) : (
              <p>No events scheduled this month.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
function EventRow({ event: e }: { event: EventBrowseItem }) {
  return (
    <Link href={e.path} className="event-agenda-row">
      {e.poster && (
        <Image
          src={e.poster}
          width={e.posterWidth}
          height={e.posterHeight}
          alt=""
          sizes="80px"
        />
      )}
      <div>
        <p>
          {e.dateLabel} ·{" "}
          {e.format === "intensive"
            ? "Intensive"
            : e.format === "sharing"
              ? "Sharing"
              : "Weekly session"}
        </p>
        <h4>{e.title}</h4>
        <p>
          {e.timeLabel ||
            (e.past ? "Time not recorded" : "Time to be announced")}
          <br />
          {e.venue || "Venue to be announced"}
        </p>
        <span>
          {e.past
            ? e.attended !== null && e.attended > 0
              ? `${e.attended} attended`
              : "Session ended"
            : e.priceMinor !== null
              ? priceLabel(e.priceMinor)
              : "Ticket details to be announced"}
        </span>
      </div>
      <span className="event-row-arrow" aria-hidden="true">
        ↗
      </span>
    </Link>
  );
}
