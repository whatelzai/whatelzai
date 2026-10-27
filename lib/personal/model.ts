import { z } from "zod";
import { currentWeek } from "@/lib/admin-week";
import { singaporeDay } from "@/lib/daily/model";
export type PersonalFocus = {
  week_of: string;
  title: string;
  area: number;
  done: boolean;
  revision: number;
};
export const personalFocusSchema = z
  .object({
    week_of: z.iso.date(),
    title: z.string().trim().min(1).max(240),
    area: z.number().int().min(1).max(8),
    done: z.boolean(),
    revision: z.number().int().min(0).max(2147483646),
  })
  .strict();
export function focusWeek(now = new Date()) {
  return currentWeek(singaporeDay(now));
}
export function currentFocusWeek(week: string, now = new Date()) {
  return week === focusWeek(now).start;
}
