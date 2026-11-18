import "server-only";
import { supabaseAdmin as db } from "@/lib/supabase-server";
export async function chatWorkspace(owner: string, thread?: string) {
  const threads = await db
    .from("admin_chat_threads")
    .select("id,title,updated_at")
    .eq("owner_id", owner)
    .order("updated_at", { ascending: false })
    .limit(50);
  if (threads.error) throw Error("Chat history unavailable");
  const selected = thread ?? threads.data?.[0]?.id;
  if (!selected)
    return { threads: threads.data ?? [], selected: null, turns: [] };
  const access = await db
    .from("admin_chat_threads")
    .select("id")
    .eq("owner_id", owner)
    .eq("id", selected)
    .maybeSingle();
  if (access.error || !access.data) throw Error("Conversation unavailable");
  const turns = await db
    .from("admin_chat_turns")
    .select("id,user_text,reply,proposal,status,created_at,applied_task_id")
    .eq("owner_id", owner)
    .eq("thread_id", selected)
    .order("created_at", { ascending: true })
    .limit(100);
  if (turns.error) throw Error("Chat history unavailable");
  return { threads: threads.data ?? [], selected, turns: turns.data ?? [] };
}
