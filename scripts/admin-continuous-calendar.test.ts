import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calendarWeeks,
  calendarSeason,
  indexCalendarEvents,
  CALENDAR_END,
  type AdminCalendarEvent,
} from "../lib/admin-calendar/model";
test("continuous weeks have seven aligned columns, no gaps and a strict December 2029 end", () => {
  const weeks = calendarWeeks("2026-11-18");
  assert.equal(weeks[0].start, "2026-11-16");
  assert.equal(weeks.at(-1)?.end, "2029-12-31");
  const days = weeks
    .flatMap((w) => w.days)
    .filter((d): d is string => d !== null);
  assert.equal(new Set(days).size, days.length);
  assert.equal(days.at(-1), CALENDAR_END);
  for (const w of weeks) {
    assert.equal(w.days.length, 7);
    assert.equal(new Date(w.start + "T12:00:00Z").getUTCDay(), 1);
  }
  for (let i = 1; i < days.length; i++)
    assert.equal(Date.parse(days[i]) - Date.parse(days[i - 1]), 86400000);
  assert.deepEqual(weeks.at(-1)?.days, [
    "2029-12-31",
    null,
    null,
    null,
    null,
    null,
    null,
  ]);
});
test("seasons cross the year boundary without changing actual month or year identity", () => {
  for (const m of ["12", "01", "02"])
    assert.equal(calendarSeason(`2027-${m}-01`), "winter");
  for (const m of ["03", "04", "05"])
    assert.equal(calendarSeason(`2027-${m}-01`), "spring");
  for (const m of ["06", "07", "08"])
    assert.equal(calendarSeason(`2027-${m}-01`), "summer");
  for (const m of ["09", "10", "11"])
    assert.equal(calendarSeason(`2027-${m}-01`), "autumn");
});
test("multi-day events index each inclusive date and never exceed the loaded horizon", () => {
  const base: AdminCalendarEvent = {
    id: "sprint",
    title: "Company sprint",
    start: "2026-11-18",
    end: "2026-12-01",
    lane: "day-job",
    location: "",
    status: "Company Q3",
    source: "fixture",
  };
  const index = indexCalendarEvents(
    [base, { ...base, id: "end", start: "2029-12-30", end: "2030-01-05" }],
    "2026-11-19",
  );
  assert.equal(index.has("2026-11-18"), false);
  assert.equal(index.get("2026-11-19")?.length, 1);
  assert.equal(index.get("2026-12-01")?.length, 1);
  assert.equal(index.has("2026-12-02"), false);
  assert.equal(index.has("2029-12-31"), true);
  assert.equal(index.has("2030-01-01"), false);
  assert.equal(
    indexCalendarEvents([{ ...base, start: "invalid" }], "2026-11-19").size,
    0,
  );
});
