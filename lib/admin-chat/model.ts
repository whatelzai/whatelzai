import { z } from "zod";
export const ADMIN_CHAT_MODEL = "gpt-6.1-sol";
export const adminChatSchema = z
  .object({
    messages: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            content: z.string().trim().min(1).max(6000),
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict()
  .refine(
    (v) =>
      v.messages.at(-1)?.role === "user" &&
      v.messages.reduce((n, m) => n + m.content.length, 0) <= 24000,
    "Conversation is too long",
  );
export function adminChatOriginAllowed(request: Request, development = false) {
  const u = new URL(request.url);
  return (
    request.headers.get("origin") === u.origin &&
    (u.origin === "https://admin.whatelz.ai" ||
      (development && ["localhost", "127.0.0.1"].includes(u.hostname)) ||
      u.hostname === process.env.VERCEL_URL ||
      u.hostname === process.env.VERCEL_BRANCH_URL)
  );
}
