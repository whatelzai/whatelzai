import matter from "gray-matter";

export const routines = [
  {
    slug: "whatelz-morning-brief",
    title: "Morning Brief",
    schedule: "Daily · 4:30am",
    file: "01-MORNING-BRIEF.md",
    summary: "Turn yesterday’s handoff into a realistic plan for today.",
  },
  {
    slug: "whatelz-evening-debrief",
    title: "Evening Debrief",
    schedule: "Daily · 9pm",
    file: "02-EVENING-DEBRIEF.md",
    summary: "Review what happened and leave a clear handoff for tomorrow.",
  },
  {
    slug: "whatelz-weekly-closeout",
    title: "Weekly Closeout",
    schedule: "Sunday · 9pm",
    file: "03-WEEKLY-CLOSEOUT.md",
    summary:
      "Review this sprint, keep the lessons and retain the daily originals.",
  },
  {
    slug: "whatelz-sprint-planning",
    title: "Sprint Planning",
    schedule: "Thursday · 9pm",
    file: "04-SPRINT-PLANNING.md",
    summary: "Prepare next week’s commitments, outcomes and focus blocks.",
  },
] as const;
export function findRoutine(slug: string) {
  return routines.find((routine) => routine.slug === slug);
}

export function parseRoutine(document: string, slug: string) {
  const source = document
    .split(/^## Notes\s*$/m)[1]
    ?.split(/^## /m)[0]
    ?.trim();
  if (!source || source.length > 40000 || !source.startsWith("---\n"))
    throw new Error("Invalid routine source");
  const { data, content } = matter(source);
  if (
    data.name !== slug ||
    typeof data.description !== "string" ||
    typeof data.metadata?.version !== "string" ||
    !content.trim()
  )
    throw new Error("Invalid skill identity or metadata");
  return {
    source: source + "\n",
    content: content.trim(),
    version: data.metadata.version,
  };
}
