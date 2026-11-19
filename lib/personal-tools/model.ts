import { z } from "zod";
import type { MoneyPlan } from "@/lib/money/model";
export const toolNames = [
  "payday",
  "meditation",
  "training",
  "practice",
  "weekly",
] as const;
export type Tool = (typeof toolNames)[number];
const date = z.iso.date();
const short = z.string().trim().min(1).max(100);
const note = z.string().trim().max(1000);
export const setSchema = z
  .object({
    exercise: short,
    reps: z.number().int().min(1).max(500),
    kg: z.number().min(0).max(1000),
  })
  .strict();
const session = z
  .object({
    kind: z.enum(["meditation", "practice"]),
    seconds: z.number().int().min(1).max(7200),
    topic: z.string().trim().max(200),
    note,
  })
  .strict();
const workout = z
  .object({
    kind: z.literal("training"),
    name: short,
    sets: z.array(setSchema).min(1).max(60),
    note,
  })
  .strict();
const routine = z
  .object({
    kind: z.literal("routine"),
    name: short,
    exercises: z.array(short).min(1).max(20),
  })
  .strict();
const payday = z
  .object({
    kind: z.literal("payday"),
    income_id: z.string().uuid(),
    tax_minor: z.number().int().min(0).max(999999999),
    confirmed: z
      .array(z.enum(["TAX", "FFA", "LTSS", "EDU", "NECC", "PLAY", "GIVE"]))
      .max(7),
  })
  .strict();
export const saveSchema = z
  .object({
    id: z.string().uuid(),
    revision: z.number().int().min(0).max(2147483646),
    occurred_on: date,
    data: z.discriminatedUnion("kind", [session, workout, routine, payday]),
  })
  .strict();
export type Save = z.infer<typeof saveSchema>;
export type Allocation = {
  jar: string;
  account: string;
  minor: number;
  planned?: boolean;
};
export type RecordData =
  | Exclude<Save["data"], { kind: "payday" }>
  | (Extract<Save["data"], { kind: "payday" }> & {
      amount_minor: number;
      allocations: Allocation[];
    });
export type ToolRecord = {
  id: string;
  revision: number;
  occurred_on: string;
  kind: RecordData["kind"];
  data: RecordData;
};
/** Integer largest-remainder split: displayed cents always sum to the received amount. */
export function allocate(
  amount: number,
  tax: number,
  plan: MoneyPlan,
): Allocation[] {
  if (
    !Number.isSafeInteger(amount) ||
    !Number.isSafeInteger(tax) ||
    tax < 0 ||
    tax >= amount
  )
    throw Error("Tax must be less than received income.");
  const rows = plan.jar_plan;
  if (
    rows.length !== 6 ||
    new Set(rows.map((r) => r.jar)).size !== 6 ||
    !rows.every(
      (r) =>
        ["FFA", "LTSS", "EDU", "NECC", "PLAY", "GIVE"].includes(r.jar) &&
        Number.isInteger(r.percent) &&
        r.percent >= 0,
    ) ||
    rows.reduce((s, r) => s + r.percent, 0) !== 100
  )
    throw Error("Jar plan needs review.");
  const base = amount - tax;
  const values = rows.map((r, i) => ({
    ...r,
    i,
    minor: Math.floor((base * r.percent) / 100),
    remainder: (base * r.percent) % 100,
  }));
  let left = base - values.reduce((s, r) => s + r.minor, 0);
  for (const r of [...values].sort(
    (a, b) => b.remainder - a.remainder || a.i - b.i,
  )) {
    if (left-- > 0) r.minor++;
  }
  return [
    { jar: "TAX", account: plan.income_account, minor: tax },
    ...values.map((r) => ({
      jar: r.jar,
      account: r.account,
      minor: r.minor,
      planned: r.planned,
    })),
  ];
}
export function elapsed(start: number | null, banked: number, now: number) {
  return Math.max(0, banked + (start === null ? 0 : Math.max(0, now - start)));
}
export function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}
export type Income = {
  id: string;
  occurred_on: string;
  amount_minor: number;
  description: string;
};
export type ToolsData = {
  records: ToolRecord[];
  plan: MoneyPlan | null;
  incomes: Income[];
  week: { start: string; end: string };
  spending: { currency: string; minor: number }[];
  focus: { title: string; done: boolean } | null;
};
