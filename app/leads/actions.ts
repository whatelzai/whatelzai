"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-server";
import { leadOwner } from "@/lib/leads/server";
import {
  leadCreateSchema,
  leadUpdateSchema,
  activityCreateSchema,
  activityUpdateSchema,
  type ActionResult,
} from "@/lib/leads/model";

export async function createLead(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const owner = await leadOwner();
  const parsed = leadCreateSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Enter a name and choose a region." };
  const { data, error } = await supabaseAdmin
    .from("member_leads")
    .insert({ ...parsed.data, owner_id: owner })
    .select("id")
    .single();
  if (error || !data)
    return { error: "The lead could not be created. Please try again." };
  revalidatePath("/leads");
  redirect(`/leads/${data.id}`);
}
export async function saveLead(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const owner = await leadOwner();
  const parsed = leadUpdateSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { error: "Check the profile fields and dates, then try again." };
  const { id, revision, ...fields } = parsed.data;
  const { data, error } = await supabaseAdmin
    .from("member_leads")
    .update({
      ...fields,
      revision: revision + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("owner_id", owner)
    .eq("id", id)
    .eq("revision", revision)
    .select("id")
    .maybeSingle();
  if (error)
    return {
      error:
        "The profile could not be saved. Your changes are still in this form.",
    };
  if (!data)
    return {
      error:
        "This profile changed in another session or is no longer available. Reload before saving again.",
    };
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  return { success: "Profile saved." };
}
export async function addActivity(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const owner = await leadOwner();
  const parsed = activityCreateSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { error: "Enter an activity name, valid date and status." };
  const { data: lead, error: leadError } = await supabaseAdmin
    .from("member_leads")
    .select("id")
    .eq("id", parsed.data.lead_id)
    .eq("owner_id", owner)
    .maybeSingle();
  if (leadError || !lead)
    return { error: "This profile is no longer available." };
  const { error } = await supabaseAdmin
    .from("member_lead_activities")
    .insert({ ...parsed.data, owner_id: owner });
  if (error)
    return { error: "This activity could not be saved. Please try again." };
  revalidatePath("/leads");
  revalidatePath(`/leads/${parsed.data.lead_id}`);
  return { success: "Activity recorded." };
}
export async function updateActivity(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const owner = await leadOwner();
  const parsed = activityUpdateSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Choose a valid activity status." };
  const { id, lead_id, revision, status } = parsed.data;
  const { data, error } = await supabaseAdmin
    .from("member_lead_activities")
    .update({
      status,
      revision: revision + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("owner_id", owner)
    .eq("lead_id", lead_id)
    .eq("id", id)
    .eq("revision", revision)
    .select("id")
    .maybeSingle();
  if (error || !data)
    return { error: "Activity could not be updated. Reload and try again." };
  revalidatePath("/leads");
  revalidatePath(`/leads/${lead_id}`);
  return { success: "Activity updated." };
}

export async function setLeadPriority(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const owner = await leadOwner();
  const parsed = z
    .object({
      id: z.uuid(),
      revision: z.coerce.number().int().positive(),
      priority: z.enum(["true", "false"]),
    })
    .strict()
    .safeParse({
      id: form.get("id"),
      revision: form.get("revision"),
      priority: form.get("priority"),
    });
  if (!parsed.success)
    return { error: "Reload this profile before changing priority." };
  const { id, revision, priority } = parsed.data;
  const result = await supabaseAdmin
    .from("member_leads")
    .update({
      is_priority: priority === "true",
      revision: revision + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("owner_id", owner)
    .eq("id", id)
    .eq("revision", revision)
    .select("id")
    .maybeSingle();
  if (result.error || !result.data)
    return {
      error:
        "This profile changed or is unavailable. Reload before trying again.",
    };
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  return {
    success:
      priority === "true"
        ? "Added to priority leads."
        : "Removed from priority leads.",
  };
}
