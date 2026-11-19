"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { dailyOwner } from "@/lib/daily/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { hasTeamAssignment } from "@/lib/team-assignment";
import { modelSchema } from "@/lib/member-ai/model";
export async function manageMember(input: unknown) {
  const owner = await dailyOwner();
  const parsed = z
    .discriminatedUnion("action", [
      z
        .object({
          action: z.literal("access"),
          userId: z.uuid(),
          active: z.boolean(),
          model: modelSchema,
        })
        .strict(),
      z
        .object({
          action: z.literal("reset"),
          userId: z.uuid(),
          cycle: z.uuid().nullable(),
        })
        .strict(),
    ])
    .safeParse(input);
  if (!parsed.success) return { error: "Invalid member change." };
  const change = parsed.data;
  if (change.action === "reset") {
    const result = await supabaseAdmin.rpc("reset_member_ai", {
      p_actor: owner,
      p_user: change.userId,
      p_expected_cycle: change.cycle,
    });
    if (result.error)
      return {
        error: "Allowance changed or reset failed. Reload before trying again.",
      };
  } else {
    if (!change.active)
      return {
        error:
          "Tree activation determines Chat access. Manage the tree assignment instead.",
      };
    if (!(await hasTeamAssignment(change.userId)))
      return { error: "Choose an activated member." };
    const enrollment = await supabaseAdmin.rpc("ensure_activated_member_ai", {
      p_user: change.userId,
    });
    if (enrollment.error)
      return { error: "Member activation could not be checked." };
    const existing = await supabaseAdmin
      .from("users")
      .select("id,supabase_auth_user_id")
      .eq("id", change.userId)
      .maybeSingle();
    if (existing.error || !existing.data?.supabase_auth_user_id)
      return { error: "Choose a registered, authenticated member account." };
    const result = await supabaseAdmin.from("member_ai_access").upsert({
      user_id: change.userId,
      active: change.active,
      model: change.model,
      allowance_micro: 1000000,
      updated_at: new Date().toISOString(),
    });
    if (result.error) return { error: "Could not update member access." };
    const audit = await supabaseAdmin.from("member_ai_admin_events").insert({
      actor_id: owner,
      user_id: change.userId,
      action: change.active ? "activate" : "pause",
    });
    if (audit.error)
      return {
        error:
          "Access changed, but the audit record could not be saved. Reload to verify.",
      };
  }
  revalidatePath("/admin/users");
  revalidatePath("/assistant");
  return {
    success:
      change.action === "reset"
        ? "Full allowance restored. Previous usage remains in history."
        : "Member access updated.",
  };
}
