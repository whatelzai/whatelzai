"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAssignedUser } from "@/lib/app-access";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function useResetCredit(
  _previous: { message: string },
  form: FormData,
) {
  const user = await requireAssignedUser();
  const parsed = z
    .object({ credit: z.uuid(), cycle: z.uuid().nullable() })
    .safeParse({
      credit: form.get("credit"),
      cycle: form.get("cycle") || null,
    });
  if (!parsed.success)
    return { message: "Reload to check your available reset." };
  const { error } = await supabaseAdmin.rpc("use_member_reset_credit", {
    p_user: user.id,
    p_credit: parsed.data.credit,
    p_expected_cycle: parsed.data.cycle,
  });
  if (error) {
    revalidatePath("/profile");
    return {
      message: error.message.includes("Reset expired")
        ? "This reset has expired."
        : error.message.includes("current reply")
          ? "Wait for your current reply to finish, then try again."
          : "Your allowance or reset may have changed. Reload to check before trying again.",
    };
  }
  revalidatePath("/profile");
  return { message: "Full reset used. Your weekly allowance is restored." };
}
