import { singaporeDay } from "./model";
import { branchParent, DAILY_PARENT } from "./paths";

export function previousWeek(now = new Date()) {
  const today = new Date(singaporeDay(now) + "T12:00:00Z");
  const weekday = (today.getUTCDay() + 6) % 7;
  const start = new Date(today.getTime() - (weekday + 7) * 86400000);
  const days = Array.from({ length: 7 }, (_, i) =>
    new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10),
  );
  // ISO week-year is the year of the week's Thursday.
  const thursday = new Date(start.getTime() + 3 * 86400000);
  const year = thursday.getUTCFullYear();
  const week = Math.ceil(
    ((thursday.getTime() - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7,
  );
  const id = `${year}-W${String(week).padStart(2, "0")}`;
  return {
    id,
    start: days[0],
    end: days[6],
    days,
    path: `${branchParent(DAILY_PARENT, "weeks").slice(0, -3).toLowerCase()}/WEEK-${id}.md`,
  };
}
export type WeeklySource = {
  day: string;
  kind: "morning" | "evening";
  path: string;
  title: string;
  hash: string;
  body: string;
};
