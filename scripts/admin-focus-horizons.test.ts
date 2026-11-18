import { test } from "node:test";
import assert from "node:assert/strict";
import { focusHorizons } from "../lib/admin-focus/model";
import type { Task } from "../lib/daily/model";
import type { AdminCalendarEvent } from "../lib/admin-calendar/model";
const task: Task = {
  id: "accepted",
  title: "Prepare session",
  lane: "ai-business",
  due_on: "2026-11-19",
  status: "open",
  revision: 1,
  accepted_on: "2026-11-18",
  completed_at: null,
};
const sprint: AdminCalendarEvent = {
  id: "63",
  title: "Sprint 63",
  lane: "day-job",
  start: "2026-11-18",
  end: "2026-12-01",
  source: "Company",
  status: "Company Q3",
};
const club: AdminCalendarEvent = {
  ...sprint,
  id: "club",
  title: "Collab",
  lane: "network-marketing",
  start: "2026-11-19",
  end: "2026-11-19",
};
test("overview combines lanes and workspace scopes both horizons without converting events into commitments", () => {
  const events = [sprint, club];
  const all = focusHorizons([task], events, "2026-11-18");
  assert.deepEqual(
    all.today.map((x) => x.title),
    ["Sprint 63"],
  );
  assert.equal(all.weekly.length, 3);
  for (const lane of ["ai-business", "day-job", "network-marketing"] as const) {
    const scoped = focusHorizons([task], events, "2026-11-18", lane);
    assert.ok(
      [...scoped.today, ...scoped.weekly, ...scoped.next].every(
        (x) => x.lane === lane,
      ),
    );
  }
  assert.equal(all.today[0].kind, "event");
  assert.equal(all.today[0].status, "Company Q3");
});
test("only accepted unfinished tasks appear; overdue work remains visible and blocked work is not ready", () => {
  const result = focusHorizons(
    [
      task,
      { ...task, id: "old", due_on: "2026-11-16" },
      { ...task, id: "proposal", accepted_on: null },
      { ...task, id: "done", status: "done" },
      { ...task, id: "blocked", status: "blocked", due_on: "2026-11-18" },
    ],
    [],
    "2026-11-18",
  );
  assert.deepEqual(
    result.today.map((x) => x.status),
    ["Carried forward", "Blocked"],
  );
  assert.equal(result.weekly.length, 3);
});
test("Monday to Sunday includes spanning sprints, excludes adjacent weeks, and explicitly separates next anchors", () => {
  const result = focusHorizons(
    [],
    [
      sprint,
      { ...club, id: "sunday", start: "2026-11-22", end: "2026-11-22" },
      {
        ...club,
        id: "next",
        lane: "ai-business",
        start: "2026-11-23",
        end: "2026-11-23",
      },
      { ...club, id: "past", start: "2026-11-15", end: "2026-11-15" },
    ],
    "2026-11-22",
  );
  assert.deepEqual(result.week, { start: "2026-11-16", end: "2026-11-22" });
  assert.equal(result.weekly.length, 2);
  assert.equal(result.today.length, 2);
  assert.deepEqual(
    result.next.map((x) => x.title),
    ["Collab"],
  );
  assert.equal(result.next[0].lane, "ai-business");
  assert.equal(focusHorizons(null, [], "2026-12-31").week.end, "2027-01-03");
});
