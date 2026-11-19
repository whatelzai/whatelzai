"use server";
import { isOwnerUser } from "@/lib/admin-policy";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ensureUserRow } from "@/lib/users";
import { supabaseAdmin } from "@/lib/supabase-server";
import { isPersona } from "@/lib/community-calendar/personas";
export async function saveCalendarPersona(form: FormData) {
  const actor = await ensureUserRow();
  if (!actor || !isOwnerUser(actor)) throw new Error("Admin access required");
  const target = z.string().uuid().safeParse(form.get("user_id"));
  const persona = form.get("persona");
  if (!target.success || !isPersona(persona))
    redirect("/admin/calendar-access?result=invalid");
  if (persona === "Oracle" && form.get("founder_confirmed") !== "on")
    redirect("/admin/calendar-access?result=founder");
  const { error } = await supabaseAdmin
    .from("community_calendar_memberships")
    .upsert(
      {
        user_id: target.data,
        persona,
        updated_by: actor.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  if (error)
    redirect(
      `/admin/calendar-access?result=${error.code === "23505" ? "oracle" : "failed"}`,
    );
  revalidatePath("/calendar");
  revalidatePath("/admin/calendar-access");
  redirect("/admin/calendar-access?result=saved");
}
