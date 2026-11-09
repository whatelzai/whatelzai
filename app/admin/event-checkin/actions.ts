"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/users";
import { supabaseAdmin } from "@/lib/supabase-server";
import { EVENT_KEY } from "@/lib/event-tickets";
export async function grantEventStaff(form: FormData) {
  await requireAdmin();
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email || email.length > 254)
    throw new Error("Enter a valid account email");
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (error || !user)
    throw new Error(
      "Ask this person to sign in to Whatelz first, then try again",
    );
  const { error: grantError } = await supabaseAdmin
    .from("event_staff")
    .upsert(
      {
        event_key: EVENT_KEY,
        user_id: user.id,
        granted_by: process.env.WHATELZ_OWNER_USER_ID!,
      },
      { onConflict: "event_key,user_id" },
    );
  if (grantError) throw new Error("Event staff could not be saved");
  revalidatePath("/admin/event-checkin");
}
export async function revokeEventStaff(form: FormData) {
  await requireAdmin();
  const id = String(form.get("user_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid account");
  const { error } = await supabaseAdmin
    .from("event_staff")
    .delete()
    .eq("event_key", EVENT_KEY)
    .eq("user_id", id);
  if (error) throw new Error("Event staff could not be removed");
  revalidatePath("/admin/event-checkin");
}
