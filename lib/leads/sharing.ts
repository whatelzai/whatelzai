import "server-only";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAssignedUser } from "@/lib/app-access";
const leadOwner = async () => (await requireAssignedUser()).id;
import { shareRecipients } from "@/lib/fcos/sharing";

export type Visibility = {
  recipient_id: string;
  mode: "none" | "all" | "selected";
  lead_ids: string[];
  revision: number;
};
export const sharedLeadColumns =
  "id,name,region,membership,stage,goal,story,interests,concerns,next_action,follow_up_on,is_priority,photo_path,updated_at";
export async function sharedLeadIds(viewer: string) {
  const r = await supabaseAdmin.rpc("shared_member_lead_ids", {
    p_recipient: viewer,
  });
  if (r.error) throw Error("Shared profiles unavailable.");
  return (r.data ?? []) as { id: string; owner_id: string }[];
}
export async function visibilitySettings() {
  const owner = await leadOwner();
  const [recipients, grants, leads] = await Promise.all([
    shareRecipients(),
    supabaseAdmin
      .from("member_lead_visibility")
      .select("recipient_id,mode,lead_ids,revision")
      .eq("owner_id", owner),
    supabaseAdmin
      .from("member_leads")
      .select("id,name")
      .eq("owner_id", owner)
      .order("name")
      .limit(501),
  ]);
  if (grants.error || leads.error) throw Error("Sharing settings unavailable.");
  return {
    recipients,
    grants: (grants.data ?? []) as Visibility[],
    leads: leads.data ?? [],
    limited: (leads.data?.length ?? 0) > 500,
  };
}
export async function loadSharedLeads(search = "") {
  const viewer = await leadOwner();
  const ids = await sharedLeadIds(viewer);
  if (!ids.length) return [];
  // Restrict before querying and never return the owner's contact/private fields.
  const r = await supabaseAdmin
    .from("member_leads")
    .select("id,name,region,stage,is_priority,photo_path,updated_at")
    .in(
      "id",
      ids.slice(0, 500).map((x) => x.id),
    )
    .ilike("name", `%${search.replace(/[\\%_]/g, "\\$&")}%`)
    .order("name")
    .limit(50);
  if (r.error) throw Error("Shared profiles unavailable.");
  return r.data ?? [];
}
