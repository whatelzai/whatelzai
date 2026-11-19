"use server";
import { revalidatePath } from "next/cache";
import { dailyOwner } from "@/lib/daily/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { creditResetSchema, resetAmount } from "@/lib/member-ai/resets";
export async function resetCredits(input: unknown) {
  const owner = await dailyOwner();
  const parsed = creditResetSchema.safeParse(input);
  if (!parsed.success)
    return { error: "Choose activated members and a full or half reset." };
  const { data, error } = await supabaseAdmin.rpc("reset_activated_member_ai", {
    p_actor: owner,
    p_targets: parsed.data.targets.map((target) => ({
      user_id: target.userId,
      expected_cycle: target.cycle,
    })),
    p_amount: resetAmount(parsed.data.amount),
    p_scope: parsed.data.scope,
  });
  if (error)
    return {
      error:
        "The reset could not be confirmed. The roster or allowance may have changed; refresh balances before retrying.",
    };
  revalidatePath("/admin/users");
  revalidatePath("/assistant");
  revalidatePath("/profile");
  return {
    success: `${data.length} ${data.length === 1 ? "member" : "members"} reset to ${parsed.data.amount === "full" ? "US$1" : "US$0.50"}. Previous usage stays in history.`,
  };
}
