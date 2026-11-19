import assert from "node:assert/strict";
import { test } from "node:test";
import { attentionItems, nextMonth } from "../lib/fcos/attention";
import { futureEvents } from "../lib/fcos/model";
import { todayUtc8 } from "../lib/leads/model";

test("attention prioritizes blockers and overdue records without claiming completion", () => {
  const items = attentionItems(
    [
      {
        id: "one",
        name: "Example",
        next_action: "Check in",
        follow_up_on: "2026-10-20",
      },
      { id: "two", name: "Today", next_action: "", follow_up_on: "2026-10-22" },
    ],
    [
      {
        id: "three",
        title: "Resolve blocker",
        status: "blocked",
        due_on: null,
      },
      {
        id: "four",
        title: "Await response",
        status: "waiting",
        due_on: "2026-10-30",
      },
    ],
    "2026-10-22",
  );
  assert.deepEqual(
    items.map((item) => item.status),
    ["Blocked", "Overdue", "Due today", "Waiting"],
  );
  assert.equal(items[1].href, "/leads/one");
  assert.equal(items[2].detail, "Choose a thoughtful next step.");
  assert.deepEqual(attentionItems([], [], "2026-10-22"), []);
});
test("MY/SG date and next-month schedule roll across day/year boundaries", () => {
  assert.equal(todayUtc8(new Date("2026-12-31T16:01:00Z")), "2027-01-01");
  assert.equal(nextMonth("2026-12"), "2027-01");
  const now = new Date("2026-10-31T16:00:00Z");
  assert.deepEqual(
    futureEvents(
      [{ end: "2026-10-31T15:59:00Z" }, { end: "2026-10-31T17:00:00Z" }],
      now,
    ),
    [{ end: "2026-10-31T17:00:00Z" }],
  );
});
