import { isOwnerUser } from "@/lib/admin-policy";
import "server-only";
import { supabaseAdmin } from "@/lib/supabase-server";
import { ensureUserRow } from "@/lib/users";
import { validatePeople, visiblePeople, type TeamPerson } from "./model";

export type Team = {
  id: string;
  slug: string;
  name: string;
  focus_person_id: string;
};
export type TeamView = {
  team: Team;
  people: TeamPerson[];
  focusId: string;
  canSeeAll: boolean;
};

export async function loadTeamView(
  slug = "whatelz-network",
): Promise<TeamView | null> {
  const user = await ensureUserRow();
  if (!user) return null;
  const { data: team, error } = await supabaseAdmin
    .from("business_teams")
    .select("id,slug,name,focus_person_id")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error("Team data is unavailable");
  if (!team) return null;
  const admin = isOwnerUser(user);
  const { data: link, error: linkError } = await supabaseAdmin
    .from("business_team_accounts")
    .select("person_id,access_role")
    .eq("team_id", team.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (linkError) throw new Error("Team access could not be checked");
  if (!admin && !link) return null;
  const { data, error: peopleError } = await supabaseAdmin
    .from("business_team_people")
    .select(
      "id,team_id,display_name,sponsor_person_id,abo_status,context,email,abo_number,current_level,next_goal,progress_notes",
    )
    .eq("team_id", team.id)
    .order("created_at")
    .order("id");
  if (peopleError) throw new Error("Team people could not be loaded");
  const people = (data ?? []) as TeamPerson[];
  validatePeople(people);
  const focusId = link?.person_id ?? team.focus_person_id;
  const canSeeAll = admin || link?.access_role === "manager";
  return {
    team,
    focusId,
    canSeeAll,
    people: admin ? people : visiblePeople(people, focusId, link!.access_role),
  };
}
