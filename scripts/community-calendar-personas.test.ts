import assert from "node:assert/strict";
import test from "node:test";
import {
  calendarView,
  canViewEvent,
  filterCalendarEvents,
  eventAudience,
} from "../lib/community-calendar/personas";
import {
  localDay,
  eventHasEnded,
  type CalendarOccurrence,
} from "../lib/community-calendar/model";
const event = (title: string): CalendarOccurrence => ({
  id: title,
  title,
  location: "Venue",
  start: "2026-10-10T12:00:00Z",
  end: "2026-10-10T14:00:00Z",
  allDay: false,
  recurring: false,
  category: "Other",
});
test("Spark sees sports, not business classes or HQ activities", () => {
  for (const title of ["Badminton", "Captain Ball"])
    assert.equal(canViewEvent(title, "Spark"), true);
  for (const title of [
    "Monday OPP Class",
    "Wednesday Soonye Leadership Class",
    "Shopping Tour",
    "HQH for Saturday Events",
  ])
    assert.equal(canViewEvent(title, "Spark"), false);
});
test("Guests see invitational sports, not Catalyst activities", () => {
  assert.equal(eventAudience("Badminton").guestInvitation, true);
  assert.deepEqual(
    filterCalendarEvents(
      [event("Badminton"), event("Monday OPP Class")],
      "Guest",
    ).map((e) => e.title),
    ["Badminton"],
  );
});
test("Catalyst sees confirmed business activities; unknown audience stays private", () => {
  for (const title of [
    "Monday OPP Class",
    "Wednesday Soonye Leadership Class",
    "Shopping Tour",
    "HQH for Saturday Events",
    "Founders Intro",
    "Founders Gather",
    "Founders Collab",
  ])
    assert.equal(canViewEvent(title, "Catalyst"), true);
  assert.equal(canViewEvent("New secret training", "Catalyst"), false);
  assert.equal(canViewEvent("New secret training", "Oracle"), true);
});
test("forged persona preview cannot elevate a non-admin", () => {
  for (const preview of ["Admin", "Oracle", "Catalyst", "Spark", undefined])
    assert.equal(calendarView("Guest", false, preview), "Guest");
  assert.equal(calendarView("Spark", false, "Oracle"), "Spark");
  assert.equal(calendarView("Guest", true, "Spark"), "Spark");
  assert.equal(calendarView("Guest", true, "invalid"), "Admin");
});
test("restricted event titles/locations never enter the filtered payload", () => {
  const rows = [
    event("Monday OPP Class"),
    event("Captain Ball"),
    event("Unknown event"),
  ];
  assert.equal(
    JSON.stringify(filterCalendarEvents(rows, "Spark")).includes(
      "Monday OPP Class",
    ),
    false,
  );
  assert.equal(filterCalendarEvents(rows, "Admin").length, 3);
});
test("today rolls over at Malaysia/Singapore midnight, not UTC midnight", () => {
  assert.equal(localDay("2026-10-09T15:59:59Z"), "2026-10-09");
  assert.equal(localDay("2026-10-09T16:00:00Z"), "2026-10-10");
});
test("a currently running event remains relevant until its end", () => {
  const e = event("Badminton");
  assert.equal(eventHasEnded(e, "2026-10-10T13:00:00Z"), false);
  assert.equal(eventHasEnded(e, "2026-10-10T14:00:00Z"), true);
});

test("FC Architect can see business activities but unknown events remain Oracle-only", () => {
  assert.equal(canViewEvent("Monday OPP Class", "Architect"), true);
  assert.equal(canViewEvent("Unknown event", "Architect"), false);
});
