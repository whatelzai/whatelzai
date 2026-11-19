import { z } from "zod";
export const resetTargetSchema = z
  .object({ userId: z.uuid(), cycle: z.uuid().nullable() })
  .strict();
export const creditResetSchema = z
  .object({
    action: z.literal("reset"),
    scope: z.enum(["selected", "all"]),
    amount: z.enum(["full", "half"]),
    targets: z.array(resetTargetSchema).min(1).max(1000),
  })
  .strict()
  .refine(
    (input) =>
      new Set(input.targets.map((target) => target.userId)).size ===
      input.targets.length,
    "Duplicate targets",
  );
export const resetAmount = (amount: "full" | "half") =>
  amount === "full" ? 1000000 : 500000;
