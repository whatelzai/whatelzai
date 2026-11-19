import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { supabaseAdmin as db } from "./supabase-server";
import { ensureUserRow } from "./users";
import { isOwnerUser } from "./admin-policy";
import {
  effectiveRole,
  isWeosRole,
  PREVIEW_COOKIE,
  type WeosRole,
} from "./weos-roles";
// Only active Whatelz roles attached to a verified existing account count.
// FC personas, ABO rank, name matching and client claims confer no app access.
export async function storedWeosRole(
  user: { id: string; role: string } | null,
): Promise<WeosRole> {
  if (!user) return "guest";
  if (isOwnerUser(user)) return "beacon";
  const links = await db
    .from("business_team_accounts")
    .select("team_id,person_id,business_team_people!inner(abo_status)")
    .eq("user_id", user.id);
  if (links.error) throw Error("Role lookup unavailable");
  if (!links.data.length) return "guest";
  const memberships = await db
    .from("weos_community_memberships")
    .select("team_id,person_id,role_code,weos_communities!inner(slug)")
    .in(
      "person_id",
      links.data.map((x) => x.person_id),
    )
    .eq("status", "active")
    .eq("weos_communities.slug", "whatelz");
  if (memberships.error) throw Error("Role lookup unavailable");
  const rows = memberships.data.filter((x) =>
    links.data.some(
      (l) => l.team_id === x.team_id && l.person_id === x.person_id,
    ),
  );
  if (
    rows.length !== 1 ||
    !isWeosRole(rows[0].role_code) ||
    rows[0].role_code === "beacon"
  )
    return "guest";
  if (rows[0].role_code === "torch") {
    const link = links.data.find(
      (x) => x.person_id === rows[0].person_id && x.team_id === rows[0].team_id,
    );
    const person = Array.isArray(link?.business_team_people)
      ? link.business_team_people[0]
      : link?.business_team_people;
    if (person?.abo_status !== "ABO") return "ember";
  }
  return rows[0].role_code;
}
export const weosAccess = cache(async () => {
  const user = await ensureUserRow();
  const actual = await storedWeosRole(user);
  const role = effectiveRole(
    actual,
    (await cookies()).get(PREVIEW_COOKIE)?.value,
  );
  return { user, actual, role, preview: actual !== role };
});
export async function requireBusinessTools() {
  const { canUseBusinessTools } = await import("./weos-roles");
  const access = await weosAccess();
  if (!canUseBusinessTools(access.role))
    throw Error("Business tools are unavailable for this role");
  return access;
}
