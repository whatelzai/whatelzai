import "server-only";
import { cache } from "react";
import { requireAssignedUser } from "@/lib/app-access";
import { isOwnerUser } from "@/lib/admin-policy";
import { supabaseAdmin as db } from "@/lib/supabase-server";
import { sharedLeadIds } from "@/lib/leads/sharing";
import { loadTeamView } from "@/lib/team/server";
import {
  membershipVisible,
  type Community,
  type CommunityData,
  type CommunityRole,
} from "./model";
export const myCommunityRoles = cache(async () => {
  const user = await requireAssignedUser();
  const links = await db
    .from("business_team_accounts")
    .select("person_id")
    .eq("user_id", user.id);
  if (links.error) throw Error("Community roles unavailable.");
  if (!links.data?.length) return [];
  const memberships = await db
    .from("weos_community_memberships")
    .select(
      "role_code,weos_communities!inner(id,slug,name),weos_community_roles!inner(code,label)",
    )
    .in(
      "person_id",
      links.data.map((x) => x.person_id),
    )
    .eq("status", "active");
  if (memberships.error) throw Error("Community roles unavailable.");
  return (memberships.data ?? []).map((x) => {
    const c = Array.isArray(x.weos_communities)
      ? x.weos_communities[0]
      : x.weos_communities;
    const r = Array.isArray(x.weos_community_roles)
      ? x.weos_community_roles[0]
      : x.weos_community_roles;
    return {
      communityId: c.id,
      slug: c.slug,
      community: c.name,
      code: x.role_code,
      label: r.label,
    };
  });
});
export const loadCommunities = cache(async (): Promise<CommunityData> => {
  const user = await requireAssignedUser();
  const [view, shared] = await Promise.all([
    loadTeamView(),
    sharedLeadIds(user.id),
  ]);
  if (!view)
    return {
      communities: [],
      roles: [],
      members: [],
      canManage: false,
      people: [],
    };
  const [communities, own] = await Promise.all([
    db
      .from("weos_communities")
      .select("id,team_id,slug,name,description")
      .eq("team_id", view.team.id)
      .order("slug"),
    db.from("member_leads").select("id").eq("owner_id", user.id),
  ]);
  if (communities.error || own.error) throw Error("Communities unavailable.");
  const cs = (communities.data ?? []) as Community[];
  if (!cs.length)
    return {
      communities: [],
      roles: [],
      members: [],
      canManage: isOwnerUser(user),
      people: view.people.map((x) => ({ id: x.id, name: x.display_name })),
    };
  const ids = cs.map((x) => x.id);
  const [roles, rows] = await Promise.all([
    db
      .from("weos_community_roles")
      .select("community_id,code,label,description,sort_order")
      .in("community_id", ids)
      .order("sort_order"),
    db
      .from("weos_community_memberships")
      .select(
        "id,community_id,team_id,person_id,lead_id,introducer_person_id,role_code,status,revision",
      )
      .eq("team_id", view.team.id)
      .in("community_id", ids)
      .limit(1000),
  ]);
  if (roles.error || rows.error)
    throw Error("Community memberships unavailable.");
  const canManage = isOwnerUser(user);
  const allowedLeads = new Set(
    [...shared, ...(own.data ?? [])].map((x) => x.id),
  );
  const allowedPeople = new Map(view.people.map((x) => [x.id, x]));
  const visiblePersonIds = new Set(allowedPeople.keys());
  const permitted = (rows.data ?? []).filter((x) =>
    membershipVisible(x, canManage, allowedLeads, visiblePersonIds),
  );
  const leadIds = [
    ...new Set(permitted.flatMap((x) => (x.lead_id ? [x.lead_id] : []))),
  ];
  const leads = leadIds.length
    ? await db.from("member_leads").select("id,name").in("id", leadIds)
    : { data: [], error: null };
  if (leads.error) throw Error("Member names unavailable.");
  const names = new Map((leads.data ?? []).map((x) => [x.id, x.name]));
  return {
    communities: cs,
    roles: (roles.data ?? []) as CommunityRole[],
    canManage,
    people: view.people.map((x) => ({ id: x.id, name: x.display_name })),
    members: permitted
      .map((x) => ({
        ...x,
        name:
          (x.person_id ? allowedPeople.get(x.person_id)?.display_name : null) ??
          names.get(x.lead_id) ??
          "Member",
        introducer:
          allowedPeople.get(x.introducer_person_id)?.display_name ?? null,
        url: x.lead_id ? `/leads/${x.lead_id}` : null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
});
export async function leadCommunityContext(
  leadId: string,
  referrerId?: string | null,
  plannedId?: string | null,
) {
  // Caller has already loaded the Baobei through its existing privacy gate.
  const data = await loadCommunities();
  return {
    roles: data.members
      .filter((x) => x.lead_id === leadId)
      .map((x) => ({
        community: data.communities.find((c) => c.id === x.community_id)?.name,
        role: data.roles.find(
          (r) => r.community_id === x.community_id && r.code === x.role_code,
        )?.label,
        status: x.status,
      })),
    referrer: data.people.find((x) => x.id === referrerId)?.name ?? null,
    planned_sponsor: data.people.find((x) => x.id === plannedId)?.name ?? null,
    placement_status: plannedId
      ? "Planned only; not an ABO registration or sponsor-tree assignment"
      : null,
  };
}
