"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, ensureUserRow } from "@/lib/users";
import { loadCommunities } from "@/lib/communities/server";
import { roleUpdateSchema } from "@/lib/communities/model";
import { supabaseAdmin as db } from "@/lib/supabase-server";
export async function updateCommunityRole(form: FormData) {
  await requireAdmin();
  const user = await ensureUserRow();
  if (!user) throw Error("Sign in.");
  const input = roleUpdateSchema.parse(Object.fromEntries(form));
  const data = await loadCommunities();
  const member = data.members.find((x) => x.id === input.id);
  if (
    !member ||
    member.lead_id ||
    !data.roles.some(
      (x) =>
        x.community_id === member.community_id && x.code === input.role_code,
    )
  )
    throw Error("Membership unavailable.");
  const result = await db
    .from("weos_community_memberships")
    .update({
      role_code: input.role_code,
      status: input.status,
      updated_by: user.id,
    })
    .eq("id", member.id)
    .eq("team_id", member.team_id)
    .eq("community_id", member.community_id)
    .eq("revision", input.revision)
    .select("id");
  if (result.error || result.data?.length !== 1)
    throw Error("Membership changed. Reload before saving.");
  for (const path of ["/communities", "/profile", "/calendar", "/leads"])
    revalidatePath(path);
  redirect(`/communities?community=${encodeURIComponent(member.community_id)}`);
}
