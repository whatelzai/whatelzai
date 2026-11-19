import { test } from "node:test";
import assert from "node:assert/strict";
import { groupPlans, planDate } from "../lib/leads/plans";
import { activityCreateSchema } from "../lib/leads/model";
test("MMI consecutive dates group across month boundary; leads/statuses/gaps remain distinct", () => {
  const plans = groupPlans([
    {
      lead_id: "a",
      title: "MMI",
      activity_on: "2026-10-30",
      status: "Planned",
    },
    {
      lead_id: "a",
      title: "MMI",
      activity_on: "2026-10-31",
      status: "Planned",
    },
    {
      lead_id: "a",
      title: "MMI",
      activity_on: "2026-11-01",
      status: "Planned",
    },
    {
      lead_id: "b",
      title: "MMI",
      activity_on: "2026-10-30",
      status: "Planned",
    },
    {
      lead_id: "a",
      title: "MMI",
      activity_on: "2026-10-30",
      status: "Tentative",
    },
    {
      lead_id: "a",
      title: "MMI",
      activity_on: "2026-11-03",
      status: "Planned",
    },
    {
      lead_id: "a",
      title: "Old",
      activity_on: "2026-10-30",
      status: "Attended",
    },
  ]);
  assert.equal(plans.length, 4);
  const mmi = plans.find((p) => p.leadId === "a" && p.status === "Planned")!;
  assert.equal(mmi.end, "2026-11-01");
  assert.equal(planDate(mmi, "2026-10-22"), "30 Oct – 1 Nov");
  assert.equal(
    planDate({ ...mmi, start: "2026-10-22", end: "2026-10-22" }, "2026-10-22"),
    "Today · 22 Oct",
  );
});
test("tentative intent is accepted distinctly from attendance", () => {
  const result = activityCreateSchema.parse({
    lead_id: "11111111-1111-4111-8111-111111111111",
    title: "Captain ball",
    activity_on: "2026-10-25",
    status: "Tentative",
    notes: "Might go",
  });
  assert.equal(result.status, "Tentative");
});
