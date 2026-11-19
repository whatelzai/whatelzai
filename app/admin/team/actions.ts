"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/users";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function linkTeamAccount(form: FormData): Promise<void> {
  await requireAdmin();
  const input = z
    .object({
      team_id: z.uuid(),
      person_id: z.uuid(),
      user_id: z.uuid(),
      access_role: z.enum(["member", "manager"]),
    })
    .parse(Object.fromEntries(form));
  const account = await supabaseAdmin
    .from("users")
    .select("id,email,supabase_auth_user_id")
    .eq("id", input.user_id)
    .maybeSingle();
  if (
    account.error ||
    !account.data?.email ||
    !account.data.supabase_auth_user_id
  )
    throw Error("Choose a signed-in account with a verified identity.");

  // Insert only: replacing a verified identity needs a separate reviewed flow.
  const { error } = await supabaseAdmin
    .from("business_team_accounts")
    .insert(input);
  if (error)
    throw new Error(
      "Account could not be linked. Check whether it is already linked.",
    );
  revalidatePath("/admin/team");
  revalidatePath("/admin/users");
  revalidatePath("/team");
}

export async function updateTeamPerson(form: FormData): Promise<void> {
  await requireAdmin();
  const blankToNull = (value: FormDataEntryValue | null) =>
    typeof value === "string" && value.trim() ? value.trim() : null;
  const input = z
    .object({
      team_id: z.uuid(),
      person_id: z.uuid(),
      email: z.email().max(254).nullable(),
      current_level: z.string().max(120).nullable(),
      next_goal: z.string().max(240).nullable(),
      progress_notes: z.string().max(1000).nullable(),
      abo_number: z
        .string()
        .regex(/^[0-9]{1,20}$/)
        .nullable(),
    })
    .parse({
      team_id: form.get("team_id"),
      person_id: form.get("person_id"),
      email: blankToNull(form.get("email"))?.toLowerCase() ?? null,
      current_level: blankToNull(form.get("current_level")),
      next_goal: blankToNull(form.get("next_goal")),
      progress_notes: blankToNull(form.get("progress_notes")),
      abo_number: blankToNull(form.get("abo_number")),
    });
  const { data, error } = await supabaseAdmin
    .from("business_team_people")
    .update({
      email: input.email,
      abo_number: input.abo_number,
      current_level: input.current_level,
      next_goal: input.next_goal,
      progress_notes: input.progress_notes,
    })
    .eq("team_id", input.team_id)
    .eq("id", input.person_id)
    .select("id")
    .single();
  if (error || !data)
    throw new Error(
      "Profile could not be saved. Check the email and ABO number.",
    );
  revalidatePath("/admin/team");
  revalidatePath("/team");
}

export async function saveTeamPerson(
  _previous: { error?: string; success?: string },
  form: FormData,
): Promise<{ error?: string; success?: string }> {
  await requireAdmin();
  try {
    await updateTeamPerson(form);
  } catch {
    return {
      error:
        "Details could not be saved. Check the email and ABO number, then try again.",
    };
  }
  revalidatePath(`/admin/team/${form.get("person_id")}`);
  return { success: "Details saved." };
}
