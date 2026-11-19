"use client";
import { useAdminPreferences } from "../AdminPreferences";
import { Suspense, useEffect, useRef, useState } from "react";
import { AdminBackTrail } from "../AdminBackTrail";
import { CalendarWeekdays } from "./CalendarWeekdays";
export function CalendarChrome({ pathname }: { pathname: string }) {
  const strip = useRef<HTMLDivElement>(null);
  const { preferences } = useAdminPreferences();
  const [period, setPeriod] = useState({ month: "", direction: "" });
  useEffect(() => {
    let frame = 0;
    function measure() {
      frame = 0;
      if (!strip.current) return;
      const edge = strip.current.getBoundingClientRect().bottom;
      const rows = document.querySelectorAll<HTMLElement>("[data-week-start]");
      let low = 0,
        high = rows.length;
      while (low < high) {
        const mid = (low + high) >>> 1;
        if (rows[mid].getBoundingClientRect().bottom <= edge) low = mid + 1;
        else high = mid;
      }
      const month = rows[
        Math.min(low, rows.length - 1)
      ]?.dataset.weekStart?.slice(0, 7);
      if (month)
        setPeriod((old) =>
          old.month === month
            ? old
            : {
                month,
                direction: old.month ? (month > old.month ? "up" : "down") : "",
              },
        );
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(measure);
    }
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);
  return (
    <div className="admin-calendar-chrome">
      <Suspense
        fallback={
          <div className="admin-calendar-back-placeholder" aria-hidden="true" />
        }
      >
        <AdminBackTrail pathname={pathname} />
      </Suspense>
      <CalendarWeekdays />
      <div
        ref={strip}
        className="calendar-period"
        data-direction={period.direction}
      >
        {period.month && (
          <>
            <span key={period.month.slice(0, 4)}>
              {period.month.slice(0, 4)}
            </span>
            <span key={period.month}>
              {new Date(period.month + "-01T12:00:00Z").toLocaleDateString(
                preferences.language === "zh" ? "zh-SG" : "en-SG",
                { month: "long", timeZone: "UTC" },
              )}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
