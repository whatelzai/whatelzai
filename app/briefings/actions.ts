"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-server";
import { briefingSchema } from "@/lib/fcos/model";
import { calendarEvent } from "@/lib/fcos/events";
import { localDay } from "@/lib/community-calendar/model";
import { fcosOwner } from "@/lib/fcos/server";
export async function saveBriefing(
  _state: { error?: string },
  form: FormData,
): Promise<{ error?: string }> {
  const owner = await fcosOwner();
  const parsed = briefingSchema.safeParse({
    ...Object.fromEntries(form),
    lead_ids: form.getAll("lead_ids"),
    event_key: form.get("event_key") || null,
    event_month: form.get("event_month") || null,
  });
  if (!parsed.success)
    return { error: "Check the title, date and note fields before saving." };
  const { id, revision, ...fields } = parsed.data;
  if (!!fields.event_key !== !!fields.event_month)
    return { error: "Choose a calendar event or unlink it before saving." };
  if (fields.event_key && fields.event_month) {
    const event = await calendarEvent(
      fields.event_month,
      fields.event_key,
    ).catch(() => null);
    if (!event)
      return {
        error:
          "This calendar event is unavailable to your account. Choose another event or unlink it. Your draft is still here.",
      };
    fields.event_name = event.title;
    fields.event_month = localDay(event.start).slice(0, 7);
  }
  let result;
  if (revision === 0)
    result = await supabaseAdmin
      .from("member_briefings")
      .insert({ ...fields, id, revision: 1, owner_id: owner })
      .select("id")
      .single();
  else
    result = await supabaseAdmin
      .from("member_briefings")
      .update({
        ...fields,
        revision: revision + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("owner_id", owner)
      .eq("revision", revision)
      .select("id")
      .maybeSingle();
  if (result.error || !result.data)
    return {
      error:
        "Could not save. A linked lead may be unavailable, or this note changed in another session. Your draft remains in this form.",
    };
  revalidatePath("/leads", "layout");
  revalidatePath("/calendar", "layout");
  revalidatePath("/briefings");
  revalidatePath("/member-home");
  revalidatePath(`/briefings/${id}`);
  redirect(`/briefings/${id}?saved=1`);
}
