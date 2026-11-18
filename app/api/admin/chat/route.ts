import { z } from "zod";
import { dailyOwner, loadDailyTasks } from "@/lib/daily/server";
import { singaporeDay } from "@/lib/daily/model";
import { openaiConnection } from "@/lib/daily/connections";
import { checkRateLimit } from "@/lib/rate-limit";
import { adminChatOriginAllowed } from "@/lib/admin-chat/model";
import { adminChatPlan } from "@/lib/admin-chat/planner";
import { chatWorkspace } from "@/lib/admin-chat/store";
import { supabaseAdmin as db } from "@/lib/supabase-server";
export const maxDuration = 75;
const json = (v: unknown, s = 200) =>
  Response.json(v, {
    status: s,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function GET(request: Request) {
  let owner;
  try {
    owner = await dailyOwner();
  } catch {
    return json({ error: "Owner sign-in required" }, 403);
  }
  try {
    const id = new URL(request.url).searchParams.get("thread");
    if (id && !z.uuid().safeParse(id).success)
      return json({ error: "Invalid conversation" }, 400);
    return json(await chatWorkspace(owner, id ?? undefined));
  } catch {
    return json({ error: "Chat history could not be loaded." }, 503);
  }
}
export async function POST(request: Request) {
  if (!adminChatOriginAllowed(request, process.env.NODE_ENV === "development"))
    return json({ error: "Open Chat in Whatelz Admin." }, 403);
  let owner;
  try {
    owner = await dailyOwner();
  } catch {
    return json({ error: "Owner sign-in required." }, 403);
  }
  if (!checkRateLimit(`admin-chat:${owner}`).allowed)
    return json({ error: "Please wait before sending another message." }, 429);
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 30000)
    return json({ error: "Message too long" }, 413);
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw || "null");
  } catch {
    return json({ error: "Invalid message." }, 400);
  }
  const input = z
    .object({
      thread_id: z.uuid().nullable(),
      request_id: z.uuid(),
      text: z.string().trim().min(1).max(6000),
    })
    .strict()
    .safeParse(decoded);
  if (!input.success) return json({ error: "Invalid message." }, 400);
  const p = input.data;
  let thread = p.thread_id;
  try {
    const prior = await db
      .from("admin_chat_turns")
      .select("id,thread_id,user_text,status,reply,proposal,updated_at")
      .eq("id", p.request_id)
      .eq("owner_id", owner)
      .maybeSingle();
    if (prior.error) throw Error();
    if (prior.data) {
      if (
        prior.data.user_text !== p.text ||
        (p.thread_id && prior.data.thread_id !== p.thread_id)
      )
        return json({ error: "Request changed; send a new message." }, 409);
      thread = prior.data.thread_id;
      if (prior.data.status === "complete")
        return json({
          thread_id: thread,
          reply: prior.data.reply,
          proposal: prior.data.proposal,
          turn_id: p.request_id,
        });
      if (
        prior.data.status === "pending" &&
        Date.now() - Date.parse(prior.data.updated_at) < 120000
      )
        return json(
          { error: "This reply is still being prepared.", thread_id: thread },
          409,
        );
    }
    if (!thread) {
      const r = await db
        .from("admin_chat_threads")
        .insert({ owner_id: owner, title: p.text.slice(0, 100) })
        .select("id")
        .single();
      if (r.error || !r.data) throw Error();
      thread = r.data.id;
    }
    const workspace = await chatWorkspace(owner, thread!);
    if (workspace.turns.length >= 100 && !prior.data)
      return json(
        { error: "Start a new conversation to continue.", thread_id: thread },
        400,
      );
    const claimTime = new Date().toISOString();
    const claim = prior.data
      ? await db
          .from("admin_chat_turns")
          .update({ status: "pending", updated_at: claimTime })
          .eq("owner_id", owner)
          .eq("id", p.request_id)
          .eq("updated_at", prior.data.updated_at)
          .select("id")
          .maybeSingle()
      : await db
          .from("admin_chat_turns")
          .insert({
            id: p.request_id,
            owner_id: owner,
            thread_id: thread,
            user_text: p.text,
            updated_at: claimTime,
          })
          .select("id")
          .maybeSingle();
    if (claim.error || !claim.data)
      return json(
        {
          error: "Another reply is in progress; please wait.",
          thread_id: thread,
        },
        409,
      );
    try {
      const connection = await openaiConnection(owner);
      if (!connection?.key) throw Error("Connect OpenAI first");
      const history: { role: "user" | "assistant"; content: string }[] = [];
      let chars = p.text.length;
      for (const t of [...workspace.turns].reverse()) {
        if (t.id === p.request_id || t.status !== "complete") continue;
        const size = t.user_text.length + (t.reply?.length ?? 0);
        if (chars + size > 22000 || history.length >= 18) break;
        history.unshift(
          { role: "user", content: t.user_text },
          { role: "assistant", content: t.reply ?? "" },
        );
        chars += size;
      }
      history.push({ role: "user", content: p.text });
      const tasks = await loadDailyTasks(singaporeDay());
      const context = JSON.stringify({
        day: singaporeDay(),
        timezone: "Asia/Singapore",
        tasks: [...tasks.active, ...tasks.completed].slice(0, 100),
        applied: workspace.turns
          .filter((t) => t.applied_task_id)
          .map((t) => ({ turn: t.id, task: t.applied_task_id })),
      });
      const answer = await adminChatPlan(connection.key, history, context);
      const saved = await db
        .from("admin_chat_turns")
        .update({
          reply: answer.reply,
          proposal: answer.proposal,
          status: "complete",
          updated_at: new Date().toISOString(),
        })
        .eq("id", p.request_id)
        .eq("owner_id", owner)
        .eq("updated_at", claimTime)
        .select("id")
        .maybeSingle();
      if (saved.error || !saved.data) throw Error();
      await db
        .from("admin_chat_threads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", thread)
        .eq("owner_id", owner);
      return json({ ...answer, thread_id: thread, turn_id: p.request_id });
    } catch {
      await db
        .from("admin_chat_turns")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", p.request_id)
        .eq("owner_id", owner)
        .eq("updated_at", claimTime);
      return json(
        {
          error: "Your message is saved. The AI could not reply; please retry.",
          thread_id: thread,
        },
        502,
      );
    }
  } catch {
    return json(
      { error: "Chat could not be saved. Please retry.", thread_id: thread },
      503,
    );
  }
}
