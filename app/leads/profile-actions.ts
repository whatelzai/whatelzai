"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-server";
import { leadOwner } from "@/lib/leads/server";
import { shareRecipients } from "@/lib/fcos/sharing";
import { prepareLeadPhoto } from "@/lib/leads/photo";
import type { ActionResult } from "@/lib/leads/model";
const photoSchema = z.object({
  id: z.uuid(),
  revision: z.coerce.number().int().positive(),
  remove: z.boolean(),
});
export async function saveLeadPrivacy(
  _: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const owner = await leadOwner();
  const p = z
    .object({
      id: z.uuid(),
      revision: z.coerce.number().int().positive(),
      visibility: z.enum(["team", "private"]),
    })
    .safeParse(Object.fromEntries(form));
  if (!p.success) return { error: "Reload this profile and try again." };
  const r = await supabaseAdmin
    .from("member_leads")
    .update({
      visibility: p.data.visibility,
      revision: p.data.revision + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", p.data.id)
    .eq("owner_id", owner)
    .eq("revision", p.data.revision)
    .select("id")
    .maybeSingle();
  if (r.error || !r.data)
    return { error: "This profile changed. Reload before saving." };
  revalidatePath("/leads", "layout");
  revalidatePath("/briefings", "layout");
  revalidatePath("/assistant");
  return {
    success:
      p.data.visibility === "private"
        ? "Hidden from the team."
        : "Visible to the team, subject to individual exclusions.",
  };
}
export async function saveLeadPhoto(
  _: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const owner = await leadOwner();
  const p = photoSchema.safeParse({
    id: form.get("id"),
    revision: form.get("revision"),
    remove: form.get("remove") === "true",
  });
  if (!p.success) return { error: "Reload this profile and try again." };
  const { id, revision, remove } = p.data;
  const existing = await supabaseAdmin
    .from("member_leads")
    .select("photo_path")
    .eq("id", id)
    .eq("owner_id", owner)
    .eq("revision", revision)
    .maybeSingle();
  if (existing.error || !existing.data)
    return { error: "This profile changed. Reload before editing." };
  let path: string | null = null;
  if (!remove) {
    const file = form.get("photo");
    if (!(file instanceof File) || file.size > 3 * 1024 * 1024 || !file.size)
      return { error: "Choose a JPG, PNG or WebP under 3 MB." };
    let bytes: Buffer;
    try {
      bytes = await prepareLeadPhoto(Buffer.from(await file.arrayBuffer()));
    } catch {
      return { error: "Choose a valid JPG, PNG or WebP under 3 MB." };
    }
    path = `${owner}/${id}/${randomUUID()}.webp`;
    const upload = await supabaseAdmin.storage
      .from("lead-photos")
      .upload(path, bytes, { contentType: "image/webp", upsert: false });
    if (upload.error)
      return { error: "Photo could not be uploaded. Try again." };
  }
  const update = await supabaseAdmin
    .from("member_leads")
    .update({
      photo_path: path,
      revision: revision + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("owner_id", owner)
    .eq("revision", revision)
    .select("id")
    .maybeSingle();
  if (update.error || !update.data) {
    // An unknown write outcome must not remove an image which may now be active.
    if (!update.error && path)
      await supabaseAdmin.storage.from("lead-photos").remove([path]);
    return {
      error: "Photo save could not be confirmed. Reload before trying again.",
    };
  }
  if (existing.data.photo_path)
    await supabaseAdmin.storage
      .from("lead-photos")
      .remove([existing.data.photo_path]);
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  return { success: remove ? "Photo removed." : "Photo updated." };
}
const visibilitySchema = z.object({
  recipient: z.uuid(),
  mode: z.enum(["none", "all", "selected"]),
  ids: z.array(z.uuid()).max(500),
  revision: z.coerce.number().int().min(0),
});
export async function saveVisibility(
  _: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const owner = await leadOwner();
  const parsed = visibilitySchema.safeParse({
    recipient: form.get("recipient"),
    mode: form.get("mode"),
    ids: form.getAll("lead"),
    revision: form.get("revision"),
  });
  if (!parsed.success) return { error: "Check the sharing selection." };
  const { recipient, mode, ids, revision } = parsed.data;
  if (
    mode !== "none" &&
    !(await shareRecipients()).some((x) => x.id === recipient)
  )
    return { error: "Choose an activated person on your team." };
  if (mode === "selected" && !ids.length)
    return { error: "Choose at least one lead, or select Private." };
  const r = await supabaseAdmin.rpc("set_member_lead_visibility", {
    p_owner: owner,
    p_recipient: recipient,
    p_mode: mode,
    p_ids: mode === "selected" ? ids : [],
    p_revision: revision,
  });
  if (r.error)
    return {
      error: "Sharing could not be saved. Reload and check your selection.",
    };
  if (!r.data)
    return {
      error: "Sharing changed in another session. Reload before saving.",
    };
  revalidatePath("/leads");
  return { success: mode === "none" ? "Access removed." : "Sharing updated." };
}
