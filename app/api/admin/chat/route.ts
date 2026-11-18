import { dailyOwner } from "@/lib/daily/server";
import { openaiConnection } from "@/lib/daily/connections";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  adminChatOriginAllowed,
  adminChatSchema,
} from "@/lib/admin-chat/model";
import { adminChatReply } from "@/lib/admin-chat/provider";
export const maxDuration = 75;
export async function POST(request: Request) {
  const json = (body: unknown, status = 200) =>
    Response.json(body, {
      status,
      headers: { "Cache-Control": "private, no-store" },
    });
  if (!adminChatOriginAllowed(request, process.env.NODE_ENV === "development"))
    return json({ error: "Open Chat in Whatelz Admin." }, 403);
  let owner: string;
  try {
    owner = await dailyOwner();
  } catch {
    return json({ error: "Owner sign-in required." }, 403);
  }
  if (!checkRateLimit(`admin-chat:${owner}`).allowed)
    return json({ error: "Please wait before sending another message." }, 429);
  if (Number(request.headers.get("content-length") ?? 0) > 40000)
    return json({ error: "Conversation too long." }, 413);
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 40000)
    return json({ error: "Conversation too long." }, 413);
  let parsed;
  try {
    parsed = adminChatSchema.safeParse(JSON.parse(raw));
  } catch {
    return json({ error: "Invalid message." }, 400);
  }
  if (!parsed.success)
    return json(
      {
        error: "Use up to 20 messages and 24,000 characters per conversation.",
      },
      400,
    );
  try {
    const connection = await openaiConnection(owner);
    if (!connection?.key)
      return json(
        {
          error: "Connect OpenAI in your private connections before chatting.",
        },
        503,
      );
    const reply = await adminChatReply(connection.key, parsed.data.messages);
    return json({ reply, model: "gpt-6.1-sol" });
  } catch {
    return json(
      {
        error:
          "The AI service could not reply. Your message is kept; please try again.",
      },
      502,
    );
  }
}
