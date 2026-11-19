import type { Task } from "./daily/model";
export type ReadingSection = { title: string; body: string };
/** Preserve source order and fenced code; the stored Markdown is never rewritten. */
export function readingSections(body: string) {
  const sections: ReadingSection[] = [];
  let title = "",
    lines: string[] = [];
  let fence: { marker: string; length: number } | null = null;
  const flush = () => {
    if (title || lines.some((line) => line.trim()))
      sections.push({ title, body: lines.join("\n").trim() });
  };
  for (const line of body.split("\n")) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = { marker: marker[1][0], length: marker[1].length };
      else if (
        marker[1][0] === fence.marker &&
        marker[1].length >= fence.length &&
        line.trim() === marker[1]
      )
        fence = null;
    }
    const heading =
      !fence && !marker ? line.match(/^###\s+(.+?)(?:\s+#+)?\s*$/) : null;
    if (heading) {
      flush();
      title = heading[1];
      lines = [];
    } else lines.push(line);
  }
  flush();
  return sections;
}
export function selectedSprint(
  tasks: Task[],
  day: string,
  lane?: Task["lane"],
) {
  return tasks
    .filter(
      (task) =>
        task.status === "open" &&
        !!task.accepted_on &&
        task.due_on <= day &&
        (!lane || task.lane === lane),
    )
    .sort(
      (a, b) => a.due_on.localeCompare(b.due_on) || a.id.localeCompare(b.id),
    )
    .slice(0, 3);
}
