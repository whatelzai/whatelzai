import { test } from "node:test";
import assert from "node:assert/strict";
import {
  summarizeUsage,
  percentage,
  resetCountdown,
  type UsageCycle,
} from "../lib/profile/usage";
const access = {
  active: true,
  model: "gpt-6.1-sol",
  allowance_micro: 1000000,
  current_cycle_id: "current",
};
const cycle: UsageCycle = {
  id: "current",
  allowance_micro: 1000000,
  spent_micro: 100000,
  reserved_micro: 50000,
  started_at: "2026-10-21T09:35:00Z",
  ends_at: "2026-10-28T09:35:00Z",
  reason: "weekly",
};
test("remaining includes reservations and ignores older cycles", () => {
  const r = summarizeUsage(
    access,
    [cycle, { ...cycle, id: "old", spent_micro: 1000000 }],
    new Date("2026-10-22T00:00:00Z"),
  );
  assert.equal(r.remaining, 850000);
  assert.equal(r.percent, 15);
  assert.equal(r.renewsAt, cycle.ends_at.replace("Z", ".000Z"));
});
test("weekly rollover projects anchored windows at and after the boundary without writes", () => {
  for (const [now, end] of [
    ["2026-10-28T09:35:00Z", "2026-11-04T09:35:00.000Z"],
    ["2026-11-11T10:00:00Z", "2026-11-18T09:35:00.000Z"],
  ]) {
    const r = summarizeUsage(access, [cycle], new Date(now));
    assert.equal(r.current, undefined);
    assert.equal(r.spent, 0);
    assert.equal(r.remaining, 1000000);
    assert.equal(r.renewsAt, end);
  }
});
test("half reset displays half the normal weekly budget", () => {
  const r = summarizeUsage(
    access,
    [
      {
        ...cycle,
        reason: "owner-reset",
        allowance_micro: 500000,
        spent_micro: 0,
        reserved_micro: 0,
      },
    ],
    new Date("2026-10-22T00:00:00Z"),
  );
  assert.equal(percentage(r.remaining, r.baseline), 50);
});
test("no cycle means no invented reset date; unassigned has no credit", () => {
  assert.equal(summarizeUsage(access, []).renewsAt, null);
  const r = summarizeUsage(null, []);
  assert.equal(r.remaining, 0);
  assert.equal(r.renewsAt, null);
});
test("countdown rounds up to minutes and stops at zero", () => {
  const end = "2026-10-28T09:35:00Z",
    now = Date.parse("2026-10-21T09:35:00Z");
  assert.equal(resetCountdown(end, now), "Resets in 7d 0h 0m");
  assert.equal(resetCountdown(end, now + 1000), "Resets in 7d 0h 0m");
  assert.equal(resetCountdown(end, now + 60000), "Resets in 6d 23h 59m");
  assert.equal(resetCountdown(end, Date.parse(end) - 1000), "Resets in 0h 1m");
  assert.equal(resetCountdown(end, Date.parse(end)), "Resetting…");
});

test("reset availability ends at its stored expiry without resurrecting used credits", async () => {
  const { availableReset, expiredReset } = await import("../lib/profile/usage");
  const credit = { used_at: null, expires_at: "2026-10-29T10:00:00Z" };
  const end = Date.parse(credit.expires_at);
  assert.equal(availableReset(credit, end - 1), true);
  assert.equal(availableReset(credit, end), false);
  assert.equal(expiredReset(credit, end), true);
  assert.equal(
    availableReset({ ...credit, used_at: "2026-10-22T10:00:00Z" }, end - 1),
    false,
  );
});
