import { z } from "zod";
const key = z.string().regex(/^[a-z][a-z0-9_]{0,39}$/);
export const feedbackQuestion = z.discriminatedUnion("type", [
  z
    .object({
      id: key,
      type: z.literal("rating"),
      text: z.string().min(1).max(240),
      low: z.string().max(60),
      high: z.string().max(60),
    })
    .strict(),
  z
    .object({
      id: key,
      type: z.literal("yes_no"),
      text: z.string().min(1).max(240),
    })
    .strict(),
  z
    .object({
      id: key,
      type: z.literal("text"),
      text: z.string().min(1).max(240),
      optional: z.boolean().default(false),
    })
    .strict(),
  z
    .object({
      id: key,
      type: z.literal("single_select"),
      text: z.string().min(1).max(240),
      options: z.array(z.string().min(1).max(120)).min(2).max(10),
      otherOption: z.string().min(1).max(120).optional(),
    })
    .strict(),
]);
export const feedbackFormConfig = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,80}$/),
    title: z.string().min(1).max(120),
    summaryQuestionId: key,
    commentPrompt: z.string().min(1).max(240).optional(),
    questions: z.array(feedbackQuestion).min(1).max(10),
  })
  .strict()
  .refine(
    (f) =>
      (!f.commentPrompt || !f.questions.some((q) => q.id === "comments")) &&
      f.questions.every(
        (q) =>
          q.type !== "single_select" ||
          (new Set(q.options).size === q.options.length &&
            (!q.otherOption || q.options.includes(q.otherOption))),
      ) &&
      new Set(f.questions.map((q) => q.id)).size === f.questions.length &&
      f.questions.some(
        (q) => q.id === f.summaryQuestionId && q.type === "rating",
      ),
  );
export type FeedbackFormConfig = z.infer<typeof feedbackFormConfig>;
export type FeedbackAnswers = Record<string, number | boolean | string>;
export function validFeedbackAnswers(
  form: FeedbackFormConfig,
  answers: FeedbackAnswers,
) {
  return (
    Object.keys(answers).length ===
      form.questions.length + (form.commentPrompt ? 1 : 0) &&
    (!form.commentPrompt || typeof answers.comments === "string") &&
    form.questions.every((q) =>
      q.type === "rating"
        ? Number.isInteger(answers[q.id]) &&
          Number(answers[q.id]) >= 1 &&
          Number(answers[q.id]) <= 5
        : q.type === "single_select"
          ? typeof answers[q.id] === "string" &&
            ((q.options.includes(String(answers[q.id])) &&
              answers[q.id] !== q.otherOption) ||
              (!!q.otherOption &&
                String(answers[q.id]).startsWith(q.otherOption + ": ") &&
                String(answers[q.id])
                  .slice(q.otherOption.length + 2)
                  .trim().length > 0))
          : q.type === "yes_no"
            ? typeof answers[q.id] === "boolean"
            : typeof answers[q.id] === "string" &&
              (q.optional || String(answers[q.id]).trim().length > 0),
    )
  );
}
export const feedbackProofInput = z
  .object({
    eventId: z.string().regex(/^[A-Za-z0-9-]{1,100}$/),
    verificationId: z.uuid(),
    token: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export const verifiedFeedbackInput = feedbackProofInput
  .extend({
    requestId: z.uuid(),
    formId: z.string().regex(/^[a-z0-9-]{1,80}$/),
    answers: z.record(
      key,
      z.union([z.number().int().min(1).max(5), z.boolean(), z.string()]),
    ),
    website: z.string().max(0).default(""),
  })
  .strict();
export const feedbackEmailInput = z
  .object({
    eventId: z.string().regex(/^[A-Za-z0-9-]{1,100}$/),
    email: z
      .string()
      .trim()
      .max(254)
      .pipe(z.email())
      .transform((v) => v.toLowerCase()),
    website: z.string().max(0).default(""),
  })
  .strict();
export const registeredFeedbackInput = feedbackEmailInput
  .extend({
    requestId: z.uuid(),
    formId: z.string().regex(/^[a-z0-9-]{1,80}$/),
    answers: z.record(
      key,
      z.union([z.number().int().min(1).max(5), z.boolean(), z.string()]),
    ),
  })
  .strict();
export const feedbackCodeInput = z
  .object({
    eventId: z.string().regex(/^[A-Za-z0-9-]{1,100}$/),
    verificationId: z.uuid(),
    code: z.string().regex(/^\d{6}$/),
  })
  .strict();

export const feedbackSnapshot = z
  .array(
    z
      .object({
        id: z.string(),
        type: z.enum(["rating", "yes_no", "text", "single_select"]),
        question: z.string(),
        answer: z.union([z.number(), z.boolean(), z.string()]),
        low: z.string().nullable().optional(),
        high: z.string().nullable().optional(),
        options: z.array(z.string()).optional(),
      })
      .strict(),
  )
  .max(20);
