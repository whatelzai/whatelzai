"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-server";
import { fcosOwner, loadBriefing } from "@/lib/fcos/server";
import { shareRecipients } from "@/lib/fcos/sharing";
const schema = z.object({
  id: z.uuid(),
  recipient: z.uuid(),
  operation: z.enum(["share", "revoke"]),
});
export async function changeNoteSharing(
  _state: { message?: string },
  form: FormData,
): Promise<{ message?: string }> {
  const owner = await fcosOwner();
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: "Choose a valid note and recipient." };
  const { id, recipient, operation } = parsed.data;
  if (!(await loadBriefing(id))) return { message: "Note unavailable." };
  let error;
  if (operation === "revoke") {
    ({ error } = await supabaseAdmin
      .from("member_briefing_shares")
      .update({ revoked_at: new Date().toISOString() })
      .eq("briefing_id", id)
      .eq("owner_id", owner)
      .eq("recipient_user_id", recipient));
  } else {
    const account = (await shareRecipients()).find(
      (person) => person.id === recipient,
    );
    if (!account || recipient === owner)
      return {
        message: "This team account is unavailable. No access was granted.",
      };
    ({ error } = await supabaseAdmin.from("member_briefing_shares").upsert(
      {
        briefing_id: id,
        owner_id: owner,
        recipient_user_id: recipient,
        recipient_label: account.label,
        revoked_at: null,
        shared_at: new Date().toISOString(),
      },
      { onConflict: "briefing_id,recipient_user_id" },
    ));
  }
  if (error)
    return { message: "Sharing could not be updated. Please try again." };
  revalidatePath(`/briefings/${id}`);
  revalidatePath("/briefings");
  return {
    message:
      operation === "revoke"
        ? "This person is excluded from this note. Previously read information cannot be recalled."
        : "Individual exclusion removed. Team access still respects hidden notes and Baobeis.",
  };
}
