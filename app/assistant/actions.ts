"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { memberActor } from "@/lib/member-ai/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { proposalSchema } from "@/lib/member-ai/model";
import { singaporeDay } from "@/lib/daily/model";
export async function createConversation() {
  const { user } = await memberActor();
  const { data, error } = await supabaseAdmin
    .from("member_ai_conversations")
    .insert({ user_id: user.id, title: `Conversation · ${singaporeDay()}` })
    .select("id")
    .single();
  if (error || !data) throw Error("Could not create a conversation.");
  return { id: data.id as string };
}
export async function newConversation(form: FormData) {
  const data = await createConversation();
  const prompt = form.get("prompt");
  const workflow =
    prompt === "hqh" || prompt === "hhh" ? `&prompt=${prompt}` : "";
  redirect(`/assistant?chat=${data.id}${workflow}`);
}
export async function acceptCommitment(input: unknown) {
  const { user } = await memberActor();
  const parsed = z
    .object({ message: z.uuid(), proposal: z.uuid() })
    .strict()
    .safeParse(input);
  if (!parsed.success) return { error: "Invalid proposal." };
  const message = await supabaseAdmin
    .from("member_ai_messages")
    .select("proposals")
    .eq("id", parsed.data.message)
    .eq("user_id", user.id)
    .eq("role", "assistant")
    .maybeSingle();
  const proposal = z.array(proposalSchema).safeParse(message.data?.proposals);
  const selected = proposal.success
    ? proposal.data.find((p) => p.id === parsed.data.proposal)
    : null;
  if (message.error || !selected)
    return { error: "Proposal unavailable. Reload this conversation." };
  const { error } = await supabaseAdmin.from("daily_tasks").upsert(
    {
      ...selected,
      owner_id: user.id,
      status: "open",
      accepted_on: singaporeDay(),
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (error) return { error: "Could not accept this commitment." };
  revalidatePath("/assistant");
  return { success: "Commitment accepted." };
}
export async function finishCommitment(input: unknown) {
  const { user } = await memberActor();
  const parsed = z
    .object({ id: z.uuid(), revision: z.number().int().nonnegative() })
    .strict()
    .safeParse(input);
  if (!parsed.success) return { error: "Invalid commitment." };
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("daily_tasks")
    .update({
      status: "done",
      completed_at: now,
      completed_on: singaporeDay(),
      revision: parsed.data.revision + 1,
      updated_at: now,
    })
    .eq("owner_id", user.id)
    .eq("id", parsed.data.id)
    .eq("revision", parsed.data.revision)
    .eq("status", "open")
    .select("id")
    .maybeSingle();
  if (error || !data)
    return { error: "This commitment changed. Reload before updating it." };
  revalidatePath("/assistant");
  return { success: "Marked complete." };
}
