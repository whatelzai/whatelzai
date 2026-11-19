import "server-only";
import { dailyOwner } from "@/lib/daily/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { FCOS_TEAM_SLUG } from "@/lib/team-assignment";
import {
  directoryEntries,
  type DirectoryAccount,
  type DirectoryPerson,
  type DirectoryLink,
} from "./model";

// Load complete bounded pages: never classify partial joins as unassigned.
async function readAll<T>(
  query: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: unknown[] | null;
    error: unknown;
    count: number | null;
  }>,
): Promise<T[]> {
  const first = await query(0, 999);
  if (first.error || first.count === null || first.count > 10000 || !first.data)
    throw Error("The complete user directory could not be loaded.");
  const rows = [...first.data];
  for (let offset = 1000; offset < first.count; offset += 1000) {
    const next = await query(offset, offset + 999);
    if (next.error || !next.data || next.count !== first.count)
      throw Error("The directory changed while loading. Refresh to check it.");
    rows.push(...next.data);
  }
  if (rows.length !== first.count)
    throw Error("The user directory is incomplete.");
  return rows as T[];
}
export async function loadUserDirectory() {
  await dailyOwner();
  const team = await supabaseAdmin
    .from("business_teams")
    .select("id,name")
    .eq("slug", FCOS_TEAM_SLUG)
    .maybeSingle();
  if (team.error || !team.data)
    throw Error("The team directory is unavailable.");
  const teamId = team.data.id;
  const [accounts, people, links] = await Promise.all([
    readAll<DirectoryAccount>((from, to) =>
      supabaseAdmin
        .from("users")
        .select("id,name,email,supabase_auth_user_id", { count: "exact" })
        .not("supabase_auth_user_id", "is", null)
        .order("id")
        .range(from, to),
    ),
    readAll<DirectoryPerson>((from, to) =>
      supabaseAdmin
        .from("business_team_people")
        .select("id,team_id,display_name,email", { count: "exact" })
        .eq("team_id", teamId)
        .order("id")
        .range(from, to),
    ),
    readAll<DirectoryLink>((from, to) =>
      supabaseAdmin
        .from("business_team_accounts")
        .select("team_id,person_id,user_id,access_role", { count: "exact" })
        .eq("team_id", teamId)
        .order("person_id")
        .range(from, to),
    ),
  ]);
  return {
    team: team.data,
    entries: directoryEntries(accounts, people, links),
    availablePeople: people.filter(
      (person) => !links.some((link) => link.person_id === person.id),
    ),
  };
}
