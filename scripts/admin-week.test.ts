import assert from "node:assert/strict";
import { test } from "node:test";
import { currentWeek, weeklyWork } from "../lib/admin-week";
import type { Task } from "../lib/daily/model";
const task = (id: string, change: Partial<Task> = {}): Task => ({
  id,
  title: id,
  lane: "ai-business",
  status: "open",
  due_on: "2026-10-25",
  accepted_on: "2026-10-20",
  revision: 0,
  completed_at: null,
  ...change,
});
test("Singapore calendar day groups Monday through Sunday across year boundaries", () => {
  assert.deepEqual(currentWeek("2026-10-25"), {
    start: "2026-10-19",
    end: "2026-10-25",
  });
  assert.deepEqual(currentWeek("2026-10-26"), {
    start: "2026-10-26",
    end: "2026-11-01",
  });
  assert.deepEqual(currentWeek("2027-01-01"), {
    start: "2026-12-28",
    end: "2027-01-03",
  });
});
test("weekly lanes keep accepted carried work, but proposals, finished and next-week work never become weekly outcomes", () => {
  const data = [
    task("proposal", { accepted_on: null, status: "proposed" }),
    task("next-week", { due_on: "2026-10-26" }),
    task("finished", { status: "done" }),
    task("carried", { due_on: "2026-10-18" }),
    task("blocked", { lane: "day-job", status: "blocked" }),
  ];
  const result = weeklyWork(data, "2026-10-25");
  assert.equal(result.next?.id, "carried");
  assert.deepEqual(
    result.lanes.map((l) => l.task?.id ?? null),
    ["carried", null, "blocked"],
  );
});
test("a future accepted action may appear this week but is not an actionable sprint yet", () => {
  const result = weeklyWork(
    [
      task("future", { due_on: "2026-10-23" }),
      task("waiting", {
        status: "waiting",
        due_on: "2026-10-19",
        lane: "network-marketing",
      }),
    ],
    "2026-10-20",
  );
  assert.equal(result.next, null);
  assert.equal(result.lanes[0].task?.id, "future");
  assert.equal(result.lanes[1].task?.id, "waiting");
  assert.deepEqual(
    weeklyWork([], "2026-10-25").lanes.map((l) => l.task),
    [null, null, null],
  );
});
