import { adminParent } from "../lib/admin-link-policy";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  focusHorizons,
  focusPath,
  focusReference,
  administrativeFocus,
} from "../lib/admin-focus/model";
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
  location: "",
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
  assert.equal(all.weekly.length, 4);
  for (const lane of ["ai-business", "day-job", "network-marketing"] as const) {
    const scoped = focusHorizons([task], events, "2026-11-18", lane);
    assert.ok(
      [...scoped.today, ...scoped.weekly].every((x) => x.lane === lane),
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
test("Today includes the ongoing sprint; week preview excludes today and next week", () => {
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
  assert.equal(result.weekly.length, 0);
  assert.equal(result.today.length, 3);
  assert.equal(focusHorizons(null, [], "2026-12-31").week.end, "2027-01-03");
});

test("focus references and deep links remain stable without introducing sequential or email identities", () => {
  const id = "task:4cc06eb6-4b59-4e67-82bc-6f04df256490";
  assert.equal(focusReference(id), focusReference(id));
  assert.notEqual(focusReference(id), focusReference("event:other"));
  const link = focusPath(id, "week", "day-job");
  assert.ok(link.startsWith("/admin/day-job/focus/"));
  assert.ok(link.endsWith("?horizon=week"));
  assert.equal(decodeURIComponent(link.split("/focus/")[1].split("?")[0]), id);
});

test("Overview alone includes Thursday planning and Sunday closeout with stable dated checkpoints", () => {
  const routines = administrativeFocus("2026-11-18");
  assert.equal(routines[0].start, "2026-11-19");
  assert.equal(routines[0].time, "21:00");
  assert.equal(routines[0].title, "Plan next week · Sprint-002");
  assert.equal(routines[1].title, "Close this week · Sprint-001");
  assert.equal(focusHorizons([], [], "2026-11-19").today[0].id, routines[0].id);
  assert.equal(focusHorizons([], [], "2026-11-19", "day-job").today.length, 0);
  assert.deepEqual(administrativeFocus("not-a-date"), []);
});

test("deep-linked focus details have a real in-app parent rather than a nonexistent focus index", () => {
  assert.equal(adminParent("/focus/task%3Auuid"), "/admin");
  for (const lane of ["ai-business", "network-marketing", "day-job"])
    assert.equal(
      adminParent(`/admin/${lane}/focus/task%3Auuid`),
      `/admin/${lane}`,
    );
});
