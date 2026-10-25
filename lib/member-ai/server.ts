import { hasTeamAssignment } from "@/lib/team-assignment";
import "server-only";
import { ensureUserRow } from "@/lib/users";
import { supabaseAdmin } from "@/lib/supabase-server";
import { openaiConnection } from "@/lib/daily/connections";
import { isOwnerUser } from "@/lib/admin-policy";
import { modelSchema, type ChatMessage } from "./model";

export const memberApiEnabled = () => process.env.MEMBER_AI_ENABLED === "true";
export async function memberActor() {
  const user = await ensureUserRow();
  if (!user) throw Error("Sign in to continue");
  if (!(await hasTeamAssignment(user.id)))
    throw Error("Your account is awaiting a tree assignment");
  const enrollment = await supabaseAdmin.rpc("ensure_activated_member_ai", {
    p_user: user.id,
  });
  if (enrollment.error)
    throw Error("Member assistant is temporarily unavailable");
  const data = enrollment.data;
  if (!data?.active) throw Error("Chat access could not be checked");
  return { user, access: { ...data, model: modelSchema.parse(data.model) } };
}
export async function platformKey() {
  // Only provider credentials are shared. No admin vault token, notes or tasks
  // enter the member context. Recheck the configured owner at the source.
  const owner = process.env.WHATELZ_OWNER_USER_ID;
  if (!owner) throw Error("AI service is not configured");
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id,role")
    .eq("id", owner)
    .maybeSingle();
  if (error || !isOwnerUser(data)) throw Error("AI service is not configured");
  const connection = await openaiConnection(owner);
  if (!connection?.key) throw Error("AI service is not configured");
  return connection.key;
}
export async function conversationMessages(
  userId: string,
  conversationId: string,
): Promise<ChatMessage[]> {
  const conversation = await supabaseAdmin
    .from("member_ai_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (conversation.error || !conversation.data)
    throw Error("Conversation unavailable");
  const { data, error } = await supabaseAdmin
    .from("member_ai_messages")
    .select("id,role,body,proposals,created_at,request_id")
    .eq("user_id", userId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw Error("Messages unavailable");
  const imageRows = await supabaseAdmin
    .from("member_ai_images")
    .select("id,request_id")
    .eq("user_id", userId)
    .eq("conversation_id", conversationId)
    .not("request_id", "is", null)
    .limit(200);
  if (imageRows.error) throw Error("Chat images unavailable");
  return (data ?? []).reverse().map((message) => ({
    ...message,
    images:
      message.role === "user"
        ? (imageRows.data ?? [])
            .filter((image) => image.request_id === message.request_id)
            .map(({ id }) => ({ id }))
        : [],
  })) as ChatMessage[];
}
export async function memberWorkspace(conversationId?: string, blank = false) {
  const actor = await memberActor();
  const [chats, tasks, cycle, link] = await Promise.all([
    supabaseAdmin
      .from("member_ai_conversations")
      .select("id,title,created_at")
      .eq("user_id", actor.user.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabaseAdmin
      .from("daily_tasks")
      .select("id,title,status,revision,due_on,lane")
      .eq("owner_id", actor.user.id)
      .in("status", ["proposed", "open", "blocked", "waiting"])
      .order("due_on")
      .limit(30),
    actor.access.current_cycle_id
      ? supabaseAdmin
          .from("member_ai_cycles")
          .select("id,allowance_micro,spent_micro,reserved_micro,ends_at")
          .eq("id", actor.access.current_cycle_id)
          .eq("user_id", actor.user.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabaseAdmin
      .from("member_emdee_links")
      .select("vault_id,handle,parent_path,encrypted_credentials")
      .eq("user_id", actor.user.id)
      .maybeSingle(),
  ]);
  if (chats.error || tasks.error || cycle.error || link.error)
    throw Error("Your workspace could not be loaded");
  const selected = blank ? undefined : (conversationId ?? chats.data?.[0]?.id);
  return {
    name: actor.user.name,
    userId: actor.user.id,
    model: actor.access.model,
    enabled: memberApiEnabled(),
    chats: chats.data ?? [],
    tasks: tasks.data ?? [],
    selected: selected ?? null,
    messages: selected
      ? await conversationMessages(actor.user.id, selected)
      : [],
    cycle:
      cycle.data && new Date(cycle.data.ends_at).getTime() > Date.now()
        ? cycle.data
        : null,
    allowance: actor.access.allowance_micro,
    vault: link.data
      ? {
          id: link.data.vault_id,
          handle: link.data.handle,
          parent: link.data.parent_path,
          connected: !!link.data.encrypted_credentials,
        }
      : null,
  };
}
