import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_FOCUS,
  normalizeFocusSettings,
  focusAt,
  focusPath,
  validFocusSettings,
  canAutoSwitch,
  rootSpace,
  parseMinute,
  minuteInput,
} from "../lib/admin-focus";
import {
  adminWorkstreams,
  adminFocusSpaces,
  adminNavigation,
} from "../lib/admin-navigation";
const at = (local: string) => focusAt(new Date(`${local}+08:00`));
test("Personal is a schedulable Home epic", () => {
  assert.deepEqual(
    adminFocusSpaces.map((item) => item.label),
    ["Overview", "Personal", "AI Business", "Network Marketing", "Day Job"],
  );
  assert.equal(rootSpace("/admin/personal"), "Personal");
  assert.equal(adminNavigation("/personal").tab, "home");
  assert.equal(
    adminWorkstreams.some((item) => String(item.label) === "Personal"),
    true,
  );
  assert.equal(adminNavigation("/personal/notes").tab, "home");
  assert.equal(rootSpace("/personal/notes"), null);
});
test("weekday transitions use exact Singapore boundaries and Overview outside the blocks", () => {
  for (const [time, space] of [
    ["07:59", "Overview"],
    ["08:00", "Overview"],
    ["08:59", "Overview"],
    ["09:00", "Day Job"],
    ["17:59", "Day Job"],
    ["18:00", "Overview"],
    ["19:00", "Network Marketing"],
    ["21:59", "Network Marketing"],
    ["22:00", "Overview"],
  ])
    assert.equal(at(`2026-10-26T${time}:00`).space, space, time);
});
test("weekend AI block and UTC day crossover are independent of device timezone", () => {
  assert.equal(at("2026-10-24T08:59:00").space, "Overview");
  assert.equal(at("2026-10-24T09:00:00").space, "AI Business");
  assert.equal(at("2026-10-25T17:59:00").space, "AI Business");
  assert.equal(at("2026-10-25T18:00:00").space, "Overview");
  assert.equal(focusAt(new Date("2026-10-26T01:00:00Z")).space, "Day Job");
});
test("manual block keys expire at the next boundary and midnight", () => {
  const start = at("2026-10-26T09:00:00");
  assert.equal(start.key, at("2026-10-26T17:59:59").key);
  assert.notEqual(start.key, at("2026-10-26T18:00:00").key);
  assert.equal(start.endsAt, Date.parse("2026-10-26T18:00:00+08:00"));
  assert.notEqual(at("2026-10-26T23:59:00").key, at("2026-10-27T00:00:00").key);
});
test("custom schedules reject overlaps, invalid ranges and arbitrary destinations", () => {
  assert.equal(validFocusSettings(DEFAULT_FOCUS), true);
  assert.equal(
    validFocusSettings({
      ...DEFAULT_FOCUS,
      blocks: [
        ...DEFAULT_FOCUS.blocks,
        { days: "weekdays", start: 500, end: 550, space: "Personal" },
      ],
    }),
    false,
  );
  assert.equal(
    validFocusSettings({
      ...DEFAULT_FOCUS,
      blocks: [{ days: "weekends", start: 0, end: 1440, space: "AI Business" }],
    }),
    true,
  );
  assert.equal(
    validFocusSettings({
      ...DEFAULT_FOCUS,
      blocks: [{ days: "weekends", start: 900, end: 800, space: "Personal" }],
    }),
    false,
  );
  assert.equal(
    validFocusSettings({
      ...DEFAULT_FOCUS,
      blocks: [
        {
          days: "weekends",
          start: 0,
          end: 1440,
          space: "https://evil.invalid",
        },
      ],
    }),
    false,
  );
  assert.equal(validFocusSettings({ ...DEFAULT_FOCUS, blocks: [] }), true);
});
test("automatic navigation preserves deep links, edits, dialogs and utility workflows", () => {
  const safe = {
    path: "/",
    initial: true,
    standalone: false,
    hash: "",
    dirty: false,
    editing: false,
    dialog: false,
    visible: true,
  };
  assert.equal(canAutoSwitch(safe), true);
  for (const path of [
    "/settings",
    "/users",
    "/today",
    "/personal",
    "/today/routines/example",
  ])
    assert.equal(canAutoSwitch({ ...safe, path }), false);
  assert.equal(
    canAutoSwitch({ ...safe, path: "/today", standalone: true }),
    true,
  );
  assert.equal(
    canAutoSwitch({
      ...safe,
      path: "/today",
      standalone: true,
      hash: "#morning",
    }),
    false,
  );
  assert.equal(
    canAutoSwitch({ ...safe, path: "/today", initial: false }),
    true,
  );
  assert.equal(
    canAutoSwitch({ ...safe, path: "/settings", initial: false }),
    false,
  );
  assert.equal(
    canAutoSwitch({ ...safe, path: "/users", initial: false }),
    false,
  );
  assert.equal(
    canAutoSwitch({ ...safe, path: "/admin/users/example", initial: false }),
    false,
  );
  assert.equal(
    canAutoSwitch({ ...safe, path: "/personal", initial: false }),
    true,
  );
  for (const key of ["dirty", "editing", "dialog"] as const)
    assert.equal(canAutoSwitch({ ...safe, [key]: true }), false);
  assert.equal(canAutoSwitch({ ...safe, visible: false }), false);
});
test("time editing handles end-of-day midnight and malformed inputs", () => {
  assert.equal(parseMinute("00:00", true), 1440);
  assert.equal(parseMinute("00:00"), 0);
  assert.equal(minuteInput(1440), "00:00");
  assert.ok(Number.isNaN(parseMinute("24:30")));
  assert.equal(minuteInput(NaN), "");
});

test("Personal timetable choices remain explicit and retain schedule settings", () => {
  const legacy = {
    ...DEFAULT_FOCUS,
    blocks: [
      {
        days: "weekdays" as const,
        start: 480,
        end: 540,
        space: "Personal" as const,
      },
    ],
  };
  assert.equal(validFocusSettings(legacy), true);
  assert.equal(normalizeFocusSettings(legacy).blocks[0].space, "Personal");
  assert.equal(legacy.blocks[0].space, "Personal");
  assert.equal(
    focusAt(new Date("2026-10-26T08:30:00+08:00"), legacy).path,
    "/admin/personal",
  );
  assert.equal(focusPath("Personal"), "/admin/personal");
});
