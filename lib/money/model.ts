import { z } from "zod";
export const incomeTypes = [
  "Working income",
  "Investment income",
  "Business income",
] as const;
/** Raw income arrives before jar allocation. Notes are optional, source is explicit. */
export function incomeFields(type: string, notes: string) {
  const category = z.enum(incomeTypes).parse(type);
  const description = z.string().trim().max(200).parse(notes) || category;
  return {
    category,
    description,
    jar: "UNALLOCATED" as const,
    scope: "personal" as const,
  };
}
export const currencies = ["SGD", "MYR", "USD"] as const;
export const jars = [
  "FFA",
  "LTSS",
  "EDU",
  "NECC",
  "PLAY",
  "GIVE",
  "TAX",
  "UNALLOCATED",
  "BUSINESS",
] as const;
export const accounts = [
  "DBS",
  "Moomoo",
  "OCBC",
  "UOB",
  "GXS",
  "MariBank",
  "Wise",
  "YouTrip",
  "Cash",
];
export const kinds = [
  "expense",
  "income",
  "transfer",
  "refund",
  "opening",
] as const;
export type Currency = (typeof currencies)[number];
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      v >= "2000-01-01" &&
      v <= "2100-12-31" &&
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Use a valid date.",
  );
const amount = z.number().int().min(1).max(999999999);
const account = z.string().trim().min(1).max(80);
const currency = z.enum(currencies);
const jar = z.enum(jars);
export const entrySchema = z
  .object({
    id: z.string().uuid(),
    kind: z.enum(kinds),
    occurred_on: day,
    amount_minor: amount,
    currency,
    jar,
    account,
    description: z.string().trim().min(1).max(200),
    category: z.string().trim().min(1).max(60),
    scope: z.enum(["personal", "ai_business", "network_marketing"]),
    to_account: account.nullable(),
    to_jar: jar.nullable(),
    to_currency: currency.nullable(),
    to_amount_minor: amount.nullable(),
  })
  .strict()
  .superRefine((v, ctx) => {
    const destination = [
      v.to_account,
      v.to_jar,
      v.to_currency,
      v.to_amount_minor,
    ];
    if (v.kind === "transfer") {
      if (destination.some((x) => x === null))
        ctx.addIssue({
          code: "custom",
          message: "A transfer needs both sides.",
        });
      if (v.currency === v.to_currency && v.amount_minor !== v.to_amount_minor)
        ctx.addIssue({
          code: "custom",
          message:
            "Same-currency transfers must match. Record fees separately.",
        });
      if (
        v.account === v.to_account &&
        v.jar === v.to_jar &&
        v.currency === v.to_currency
      )
        ctx.addIssue({
          code: "custom",
          message: "Choose a different destination account or jar.",
        });
    } else if (destination.some((x) => x !== null))
      ctx.addIssue({
        code: "custom",
        message: "Only transfers have destinations.",
      });
  });
export const recurringSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(200),
    amount_minor: amount,
    currency,
    account,
    jar,
    category: z.string().trim().min(1).max(60),
    scope: z.enum(["personal", "ai_business", "network_marketing"]),
    cadence: z.enum(["weekly", "monthly", "yearly"]),
    next_due: day,
    anchor_day: z.number().int().min(1).max(31),
    anchor_month: z.number().int().min(1).max(12),
    decision: z.enum(["keep", "review", "cancel"]),
    notes: z.string().trim().max(500),
  })
  .strict();
export const commandSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("entry_date"),
      id: z.string().uuid(),
      expected_date: day,
      occurred_on: day.refine(
        (v) => v < "2100-01-01",
        "Use a date before 2100.",
      ),
    })
    .strict(),
  z.object({ action: z.literal("entry"), entry: entrySchema }),
  z.object({ action: z.literal("recurring"), rule: recurringSchema }),
  z.object({
    action: z.literal("recurring_status"),
    id: z.string().uuid(),
    active: z.boolean(),
  }),
  z.object({
    action: z.literal("void"),
    id: z.string().uuid(),
    voided: z.boolean(),
  }),
  z.object({
    action: z.literal("paid"),
    id: z.string().uuid(),
    request_id: z.string().uuid(),
    expected_due: day,
    paid_on: day,
    amount_minor: amount,
  }),
]);
export type EntryInput = z.infer<typeof entrySchema>;
export type Entry = EntryInput & {
  voided: boolean;
  recurring_id: string | null;
  recurring_due: string | null;
  created_at: string;
};
export type Rule = z.infer<typeof recurringSchema> & { active: boolean };
export type Group = {
  currency: Currency;
  jar: string;
  kind: string;
  total: number;
};
export type Balance = { currency: Currency; jar: string; total: number };
export type MoneyPlan = {
  jar_base_minor: number;
  tax_minor: number;
  reserve_target_minor: number;
  income_account: string;
  jar_plan: {
    jar: string;
    percent: number;
    cents: number;
    account: string;
    planned?: boolean;
  }[];
};
export type MoneyData = {
  plan: MoneyPlan | null;
  entries: Entry[];
  total: number;
  rules: Rule[];
  summary: { activity: Group[]; balances: Balance[] };
};
export function minorUnits(value: string): number {
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(value.trim()))
    throw Error("Enter an amount with at most two decimal places.");
  const [whole, fraction = ""] = value.trim().split(".");
  const n = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (n < 1 || n > 999999999)
    throw Error("Enter a positive amount below 10 million.");
  return n;
}
export function money(n: number, currency: string) {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency,
    currencyDisplay: "code",
  }).format(n / 100);
}
export function singaporeDay(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function monthRange(month: string) {
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)) throw Error("Invalid month.");
  const start = month + "-01";
  const next = new Date(start + "T00:00:00Z");
  next.setUTCMonth(next.getUTCMonth() + 1);
  return { start, end: next.toISOString().slice(0, 10) };
}
export function nextDue(
  due: string,
  cadence: Rule["cadence"],
  anchorDay: number,
  anchorMonth: number,
) {
  const date = new Date(due + "T00:00:00Z");
  if (cadence === "weekly") date.setUTCDate(date.getUTCDate() + 7);
  else {
    const year = date.getUTCFullYear() + (cadence === "yearly" ? 1 : 0);
    const month =
      cadence === "yearly" ? anchorMonth - 1 : date.getUTCMonth() + 1;
    const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    date.setTime(Date.UTC(year, month, Math.min(anchorDay, last)));
  }
  return date.toISOString().slice(0, 10);
}
export function csvCell(value: unknown) {
  let s = String(value ?? "");
  if (/^[\s]*[=+\-@]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
