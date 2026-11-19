"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { memberActor } from "@/lib/member-ai/server";
import { beginMemberEmdee, confirmMemberEmdee } from "@/lib/member-ai/emdee";
import { supabaseAdmin } from "@/lib/supabase-server";
export async function connect(form: FormData) {
  const { user } = await memberActor();
  const path = String(form.get("collection") ?? "");
  let url;
  try {
    url = await beginMemberEmdee(user.id, path);
  } catch {
    redirect("/assistant/connections?result=failed");
  }
  redirect(url);
}
export async function confirm() {
  const { user } = await memberActor();
  try {
    await confirmMemberEmdee(user.id);
  } catch {
    redirect("/assistant/connections?result=failed");
  }
  revalidatePath("/assistant");
  redirect("/assistant/connections?result=connected");
}
export async function disconnect() {
  const { user } = await memberActor();
  const result = await supabaseAdmin
    .from("member_emdee_links")
    .update({ encrypted_credentials: null })
    .eq("user_id", user.id);
  if (result.error) throw Error("Could not disconnect.");
  await supabaseAdmin
    .from("member_emdee_pending")
    .delete()
    .eq("user_id", user.id);
  revalidatePath("/assistant");
  redirect("/assistant/connections");
}
