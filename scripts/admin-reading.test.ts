import assert from "node:assert/strict";
import { test } from "node:test";
import { readingSections, selectedSprint } from "../lib/admin-reading";
import type { Task } from "../lib/daily/model";
test("reading disclosure preserves every section, fenced headings and C# titles", () => {
  const body =
    "# Brief\n\nNotes\n### First action\nDo one useful thing.\n### Sources\n```md\n### Not a section\n```\n### C#\nKeep the original topic.";
  const sections = readingSections(body);
  assert.deepEqual(
    sections.map((s) => s.title),
    ["", "First action", "Sources", "C#"],
  );
  assert(sections[2].body.includes("### Not a section"));
  assert.equal(sections[3].body, "Keep the original topic.");
  assert.equal(
    readingSections("Unstructured entry")[0].body,
    "Unstructured entry",
  );
  assert.deepEqual(readingSections(""), []);
});
test("sprint focus uses only explicit accepted open due work in the selected lane", () => {
  const task = (id: string, change: Partial<Task> = {}): Task => ({
    id,
    title: id,
    lane: "ai-business",
    status: "open",
    due_on: "2026-10-24",
    accepted_on: "2026-10-23",
    completed_at: null,
    revision: 0,
    ...change,
  });
  const tasks = [
    task("proposal", { status: "proposed", accepted_on: null }),
    task("future", { due_on: "2026-10-25" }),
    task("done", { status: "done" }),
    task("other", { lane: "day-job" }),
    task("blocked", { status: "blocked" }),
    task("unaccepted", { accepted_on: null }),
    task("now"),
    task("earlier", { due_on: "2026-10-23" }),
    task("z"),
    task("zz"),
  ];
  assert.deepEqual(
    selectedSprint(tasks, "2026-10-24", "ai-business").map((t) => t.id),
    ["earlier", "now", "z"],
  );
  assert.equal(selectedSprint(tasks, "2026-10-24", "day-job")[0].id, "other");
  assert.equal(tasks.length, 10);
});
