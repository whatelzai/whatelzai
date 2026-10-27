"use server";
import { revalidatePath } from "next/cache";
import { requireAssignedUser } from "@/lib/app-access";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function dismissRelease(releaseId: number) {
  const user = await requireAssignedUser();
  if (!Number.isSafeInteger(releaseId) || releaseId < 1)
    return { saved: false };
  const { error } = await supabaseAdmin.rpc("acknowledge_member_release", {
    p_user: user.id,
    p_release: releaseId,
  });
  if (!error) {
    revalidatePath("/member-home");
    revalidatePath("/");
  }
  return { saved: !error };
}
