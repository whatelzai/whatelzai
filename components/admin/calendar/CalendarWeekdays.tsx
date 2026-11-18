"use client";
import { useAdminPreferences } from "../AdminPreferences";
/** Lives in the sticky app chrome, outside the scrolling/overflow-clipped main. */
export function CalendarWeekdays() {
  const { preferences } = useAdminPreferences();
  const locale = preferences.language === "zh" ? "zh-SG" : "en-SG";
  return (
    <div className="calendar-weekdays" aria-hidden="true">
      {Array.from({ length: 7 }, (_, i) =>
        new Date(`2026-11-${16 + i}T12:00:00Z`).toLocaleDateString(locale, {
          weekday: "short",
          timeZone: "Asia/Singapore",
        }),
      ).map((day) => (
        <span key={day}>{day}</span>
      ))}
    </div>
  );
}
