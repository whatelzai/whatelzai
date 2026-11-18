import { z } from "zod";
import { branchParent, DAILY_PARENT } from "./paths";

export const lanes = [
  "day-job",
  "ai-business",
  "network-marketing",
  "personal",
] as const;
export const laneLabels = {
  personal: "Personal",
  "day-job": "AsiaVerify",
  "ai-business": "AI business",
  "network-marketing": "Network Marketing",
};
export const statuses = [
  "proposed",
  "open",
  "blocked",
  "waiting",
  "done",
  "deferred",
  "dropped",
] as const;
export const taskSchema = z.object({
  title: z.string().trim().min(1).max(240),
  lane: z.enum(lanes),
  due_on: z.iso.date(),
});
export const taskChangeSchema = z.object({
  id: z.uuid(),
  revision: z.coerce.number().int().nonnegative(),
  status: z.enum(statuses),
});
export const briefSchema = z.object({
  day: z.iso.date(),
  kind: z.enum(["morning", "evening"]),
  body: z.string().trim().min(1).max(20000),
  hash: z
    .string()
    .regex(/^[a-f0-9]{16}$/)
    .or(z.literal("")),
});
export type BriefKind = "morning" | "evening";
export type Task = z.infer<typeof taskSchema> & {
  id: string;
  status: (typeof statuses)[number];
  revision: number;
  accepted_on: string | null;
  completed_at: string | null;
};
export type ActionResult = { error?: string; success?: string };
export type Brief = {
  body: string;
  hash: string;
  path: string;
  exists: boolean;
};
export function singaporeDay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function previousDay(day: string): string {
  return new Date(Date.parse(day + "T12:00:00Z") - 86400000)
    .toISOString()
    .slice(0, 10);
}
export function briefPath(
  parent: string,
  day: string,
  kind: BriefKind,
): string {
  if (!z.iso.date().safeParse(day).success)
    throw new Error("Invalid brief date.");
  const target = parent === DAILY_PARENT ? branchParent(parent, kind) : parent;
  return `${target.slice(0, -3).toLowerCase()}/${day}-${kind.toUpperCase()}.md`;
}
