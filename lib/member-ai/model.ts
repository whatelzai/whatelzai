import { z } from "zod";

export const modelSchema = z.enum(["gpt-6-luna", "gpt-6.1-sol"]);
export type MemberModel = z.infer<typeof modelSchema>;
export const MAX_CALLS = 4;
export const MAX_PAYLOAD_BYTES = 60000;
export const MAX_OUTPUT_TOKENS = 1024;
// USD micro-units per token, standard short-context pricing, checked 2026-10-21.
export const rates = {
  "gpt-6-luna": { input: 0.1, output: 0.5 },
  "gpt-6.1-sol": { input: 2, output: 10 },
} as const;
export function reserveCost(model: MemberModel, images = 0) {
  const rate = rates[model];
  return Math.ceil(
    MAX_CALLS *
      ((MAX_PAYLOAD_BYTES + 8192 + Math.min(2, Math.max(0, images)) * 8192) *
        rate.input +
        MAX_OUTPUT_TOKENS * rate.output),
  );
}
export function usageCost(model: MemberModel, input: number, output: number) {
  if (![input, output].every((n) => Number.isSafeInteger(n) && n >= 0))
    throw Error("Invalid usage receipt");
  // Charge cached inputs at the higher uncached rate: a conservative allowance,
  // not an invoice. Provider credits/discounts cannot cause an allowance overrun.
  return Math.ceil(input * rates[model].input + output * rates[model].output);
}
export const sendSchema = z
  .object({
    requestId: z.uuid(),
    conversationId: z.uuid(),
    text: z.string().trim().min(1).max(6000),
    imageIds: z.array(z.uuid()).max(2).default([]),
  })
  .strict();
export const proposalSchema = z
  .object({
    id: z.uuid(),
    title: z.string().trim().min(1).max(240),
    lane: z.enum(["day-job", "ai-business", "network-marketing"]),
    due_on: z.iso.date(),
  })
  .strict();
export type Proposal = z.infer<typeof proposalSchema>;
export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  body: string;
  proposals: Proposal[];
  request_id?: string;
  images?: { id: string }[];
};
export function money(micro: number, precision = 2) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: precision,
  }).format(micro / 1000000);
}
