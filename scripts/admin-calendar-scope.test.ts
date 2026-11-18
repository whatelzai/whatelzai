import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calendarScope,
  calendarWorkspace,
  calendarWorkspaceHref,
} from "../lib/admin-calendar/scope";
import { adminParent } from "../lib/admin-link-policy";
import { canAutoSwitch } from "../lib/admin-focus";
test("header choices keep the calendar route and use validated, shareable scope values", () => {
  for (const [path, value, label] of [
    ["/admin", "all", "Overview"],
    ["/admin/personal", "personal", "Personal"],
    ["/admin/ai-business", "ai-business", "AI Business"],
    ["/admin/network-marketing", "network-marketing", "Network Marketing"],
    ["/admin/day-job", "day-job", "Day Job"],
  ]) {
    const target = new URL(
      calendarWorkspaceHref(path),
      "https://admin.whatelz.ai",
    );
    assert.equal(target.pathname, "/admin/calendar");
    const scope = calendarScope(target.searchParams.get("space"));
    assert.equal(scope, value);
    assert.equal(calendarWorkspace(scope), label);
  }
  for (const value of [null, undefined, "all", "evil", "https://evil.test"])
    assert.equal(calendarScope(value), "all");
  assert.equal(adminParent("/admin/calendar"), "/admin");
  assert.equal(adminParent("/calendar"), "/admin");
});
test("schedule transitions cannot navigate away while the owner is working in calendar", () => {
  for (const path of ["/calendar", "/admin/calendar"])
    assert.equal(
      canAutoSwitch({
        path,
        initial: false,
        standalone: true,
        hash: "",
        dirty: false,
        editing: false,
        dialog: false,
        visible: true,
      }),
      false,
    );
});
