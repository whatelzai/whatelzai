import test from "node:test";
import assert from "node:assert/strict";
import {
  activities,
  activityStatus,
  activityDate,
} from "../content/activities/index";
const a = activities[0];
const now = Date.parse("2026-10-15T12:00:00+08:00");
test("unconfirmed or malformed dates never advertise a scheduled gathering", () => {
  assert.equal(activityStatus(a, now), "planning");
  assert.equal(
    activityStatus({ ...a, startsAt: "invalid", endsAt: "invalid" }, now),
    "planning",
  );
  assert.equal(
    activityStatus(
      { ...a, startsAt: "2026-10-16T12:00:00+08:00", endsAt: null },
      now,
    ),
    "planning",
  );
});
test("sessions remain current until their end and archive exactly at the boundary", () => {
  const session = {
    ...a,
    startsAt: "2026-10-15T11:00:00+08:00",
    endsAt: "2026-10-15T13:00:00+08:00",
  };
  assert.equal(activityStatus(session, now), "upcoming");
  assert.equal(activityStatus(session, Date.parse(session.endsAt)), "past");
  assert.equal(
    activityStatus({ ...session, endsAt: session.startsAt }, now),
    "planning",
  );
});
test("dates are rendered in Singapore regardless of server timezone", () => {
  assert.match(activityDate("2026-10-15T23:00:00Z"), /16 Oct 2026/);
  assert.match(activityDate("2026-10-15T23:00:00Z"), /7:00/);
});
