import "server-only";
import { supabaseAdmin } from "@/lib/supabase-server";

export const FCOS_TEAM_SLUG = "whatelz-network";
export async function hasTeamAssignment(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("business_team_accounts")
    .select("person_id,business_teams!inner(slug)")
    .eq("user_id", userId)
    .eq("business_teams.slug", FCOS_TEAM_SLUG)
    .limit(1)
    .maybeSingle();
  if (error) throw Error("Team assignment could not be checked.");
  return !!data;
}
