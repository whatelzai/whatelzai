import { z } from "zod";
export const regions = [
  "FC Central",
  "FC Northern",
  "FC Southern",
  "Unassigned",
] as const;
export const memberships = ["Unknown", "Guest", "Spark", "Catalyst"] as const;
export const stages = [
  "Raw namelist",
  "Invited",
  "Engaged",
  "Following up",
  "ABO",
  "APC",
  "Not now",
] as const;
export const goals = ["Undecided", "ABO", "APC"] as const;
export const activityStatuses = [
  "Attended",
  "Planned",
  "Tentative",
  "To invite",
  "Conversation",
  "Missed",
  "Cancelled",
] as const;
export function validDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    value >= "1900-01-01" &&
    value <= "2100-12-31" &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
const date = z.string().refine(validDate, "Choose a valid date.");
const optionalDate = z
  .union([date, z.literal("")])
  .transform((value) => value || null);
const text = (max: number) => z.string().trim().max(max);
export const leadCreateSchema = z.object({
  name: text(160).min(1, "Enter a name."),
  region: z.enum(regions),
});
export const leadUpdateSchema = z.object({
  id: z.uuid(),
  revision: z.coerce.number().int().positive(),
  name: text(160).min(1, "Enter a name."),
  region: z.enum(regions),
  membership: z.enum(memberships),
  stage: z.enum(stages),
  goal: z.enum(goals),
  email: z.union([z.email().max(254), z.literal("")]),
  phone: text(80),
  birthday: optionalDate,
  zodiac: text(80),
  relationship: text(2000),
  story: text(10000),
  interests: text(4000),
  concerns: text(4000),
  notes: text(10000),
  next_action: text(1000),
  follow_up_on: optionalDate,
});
export const activityCreateSchema = z.object({
  lead_id: z.uuid(),
  title: text(240).min(1, "Enter an activity name."),
  activity_on: date,
  status: z.enum(activityStatuses),
  notes: text(4000),
});
export const activityUpdateSchema = z.object({
  id: z.uuid(),
  lead_id: z.uuid(),
  revision: z.coerce.number().int().positive(),
  status: z.enum(activityStatuses),
});
export type Lead = Omit<z.infer<typeof leadUpdateSchema>, "id"> & {
  id: string;
  updated_at: string;
  is_priority: boolean;
  visibility?: "team" | "private";
  has_photo?: boolean;
};
export type LeadSummary = Pick<
  Lead,
  | "id"
  | "name"
  | "region"
  | "membership"
  | "stage"
  | "goal"
  | "next_action"
  | "follow_up_on"
  | "is_priority"
  | "has_photo"
> & { updated_at?: string };
export type Activity = z.infer<typeof activityCreateSchema> & {
  id: string;
  revision: number;
};
export type ActionResult = { error?: string; success?: string };
export function todayUtc8(now = new Date()) {
  return new Date(now.getTime() + 8 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}
export function ageOn(
  birthday: string | null,
  today = todayUtc8(),
): number | null {
  if (!birthday || !validDate(birthday) || birthday > today) return null;
  return (
    Number(today.slice(0, 4)) -
    Number(birthday.slice(0, 4)) -
    (today.slice(5) < birthday.slice(5) ? 1 : 0)
  );
}
export function dateLabel(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-MY", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${value}T00:00:00Z`))
    : "Not set";
}
