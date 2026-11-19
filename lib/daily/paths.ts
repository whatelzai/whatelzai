export const DAILY_PARENT = "edmund/01-personal/01-DAILY.md";
export const LEGACY_DAILY_PARENT =
  "edmund/03-projects/02-whatelz_ai/DAILY-BRIEFINGS.md";
export const DAILY_TITLE = "01-PERSONAL — 01-DAILY";
export function branchParent(
  parent: string,
  kind: "morning" | "evening" | "weeks",
) {
  const segment = {
    morning: "01-MORNING",
    evening: "02-EVENING",
    weeks: "03-WEEKS",
  }[kind];
  return `${parent.slice(0, -3).toLowerCase()}/${segment}.md`;
}
