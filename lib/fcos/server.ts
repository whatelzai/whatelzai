import "server-only";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAssignedUser } from "@/lib/app-access";
import { sharedLeadIds } from "@/lib/leads/sharing";
import { sharedBriefingIds } from "./sharing";
import type { Briefing } from "./model";
export async function fcosOwner() {
  const user = await requireAssignedUser();
  if (!user) throw Error("Sign in to continue.");
  return user.id;
}
export async function briefingLeads() {
  const owner = await fcosOwner();
  const shared = await sharedLeadIds(owner);
  const { data, error } = await supabaseAdmin
    .from("member_leads")
    .select("id,name")
    .or(
      `owner_id.eq.${owner},id.in.(${
        shared
          .slice(0, 500)
          .map((x) => x.id)
          .join(",") || "00000000-0000-0000-0000-000000000000"
      })`,
    )
    .order("name")
    .limit(200);
  if (error) throw Error("Leads unavailable.");
  return data ?? [];
}
export async function loadBriefing(id: string) {
  const owner = await fcosOwner();
  const { data, error } = await supabaseAdmin
    .from("member_briefings")
    .select(
      "id,kind,title,event_name,event_key,event_month,occurred_on,lead_ids,observations,reflections,next_steps,status,revision,visibility",
    )
    .eq("owner_id", owner)
    .eq("id", id)
    .maybeSingle();
  if (error) throw Error("Note unavailable.");
  return data as Briefing | null;
}
export async function loadBriefings(page = 1) {
  const owner = await fcosOwner();
  const { data, error, count } = await supabaseAdmin
    .from("member_briefings")
    .select("id,kind,title,event_name,occurred_on,status", { count: "exact" })
    .eq("owner_id", owner)
    .order("updated_at", { ascending: false })
    .order("id")
    .range((page - 1) * 30, page * 30 - 1);
  if (error) throw Error("Notes unavailable.");
  return { items: data ?? [], count: count ?? 0 };
}

export async function contextBriefings(
  context: { lead: string } | { event: string },
) {
  const owner = await fcosOwner();
  const shared = await sharedBriefingIds(owner);
  let query = supabaseAdmin
    .from("member_briefings")
    .select("id,kind,title,status,occurred_on", { count: "exact" })
    .or(
      `owner_id.eq.${owner},id.in.(${
        shared
          .slice(0, 500)
          .map((x) => x.id)
          .join(",") || "00000000-0000-0000-0000-000000000000"
      })`,
    );
  query =
    "lead" in context
      ? query.contains("lead_ids", [context.lead])
      : query.eq("event_key", context.event);
  const { data, error, count } = await query
    .order("updated_at", { ascending: false })
    .limit(20);
  if (error) throw Error("Linked notes unavailable.");
  return { items: data ?? [], count: count ?? 0 };
}
