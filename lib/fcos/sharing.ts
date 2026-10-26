import "server-only";
import { supabaseAdmin } from "@/lib/supabase-server";
import { fcosOwner } from "./server";
import { loadTeamView } from "@/lib/team/server";
// Only permitted saved note content is readable. Never select lead IDs,
// profile data, owner account details, recipient lists or private chat context.
export const sharedColumns =
  "id,kind,title,event_name,occurred_on,observations,reflections,next_steps,status";
export async function shareRecipients() {
  const owner = await fcosOwner();
  const team = await loadTeamView();
  if (!team || !team.people.length) return [];
  const { data, error } = await supabaseAdmin
    .from("business_team_accounts")
    .select("user_id,person_id")
    .eq("team_id", team.team.id)
    .in(
      "person_id",
      team.people.map((person) => person.id),
    )
    .neq("user_id", owner);
  if (error) throw Error("Team accounts unavailable.");
  return (data ?? []).map((account) => ({
    id: account.user_id,
    label: team.people.find((person) => person.id === account.person_id)!
      .display_name,
  }));
}
export async function noteShares(id: string) {
  const owner = await fcosOwner();
  const { data, error } = await supabaseAdmin
    .from("member_briefing_shares")
    .select("recipient_user_id,recipient_label")
    .eq("briefing_id", id)
    .eq("owner_id", owner)
    .is("revoked_at", null)
    .order("shared_at");
  if (error) throw Error("Sharing settings unavailable.");
  return data ?? [];
}
export async function sharedBriefingIds(viewer: string) {
  const r = await supabaseAdmin.rpc("shared_member_briefing_ids", {
    p_recipient: viewer,
  });
  if (r.error) throw Error("Team notes unavailable.");
  return (r.data ?? []) as { id: string; owner_id: string }[];
}
export async function loadSharedBriefing(id: string) {
  const viewer = await fcosOwner();
  const allowed = await supabaseAdmin.rpc("can_read_member_briefing", {
    p_viewer: viewer,
    p_note: id,
  });
  if (allowed.error) throw Error("Team note unavailable.");
  if (!allowed.data) return null;
  const { data, error } = await supabaseAdmin
    .from("member_briefings")
    .select(sharedColumns)
    .eq("id", id)
    .maybeSingle();
  if (error) throw Error("Team note unavailable.");
  return data;
}
export async function sharedBriefings(page: number) {
  const ids = await sharedBriefingIds(await fcosOwner());
  if (!ids.length) return { items: [], count: 0 };
  const r = await supabaseAdmin
    .from("member_briefings")
    .select("id,kind,title,event_name,occurred_on,status", { count: "exact" })
    .in(
      "id",
      ids.slice(0, 500).map((x) => x.id),
    )
    .order("updated_at", { ascending: false })
    .order("id")
    .range((page - 1) * 30, page * 30 - 1);
  if (r.error) throw Error("Team notes unavailable.");
  return { items: r.data ?? [], count: r.count ?? 0 };
}
