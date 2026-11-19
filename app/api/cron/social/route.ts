import { validPushCronBearer } from "@/lib/admin-push/cron-auth";
import { supabaseAdmin as db } from "@/lib/supabase-server";
import { isOwnerUser } from "@/lib/admin-policy";
import { hasTeamAssignment } from "@/lib/team-assignment";
import { syncAccount } from "@/lib/social/server";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
const headers = { "Cache-Control": "private, no-store" };
export async function HEAD() {
  return new Response(null, { status: 405 });
}
export async function GET(request: Request) {
  if (
    !validPushCronBearer(
      request.headers.get("authorization") ?? "",
      process.env.CRON_SECRET,
    )
  )
    return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  if (process.env.VERCEL_ENV !== "production")
    return Response.json(
      { error: "Production only" },
      { status: 503, headers },
    );
  try {
    const owner = process.env.WHATELZ_OWNER_USER_ID;
    const user = await db
      .from("users")
      .select("id,role")
      .eq("id", owner ?? "00000000-0000-0000-0000-000000000000")
      .maybeSingle();
    if (!isOwnerUser(user.data) || !owner || !(await hasTeamAssignment(owner)))
      return Response.json({ skipped: true }, { headers });
    const { data, error } = await db
      .from("social_accounts")
      .select("id")
      .eq("owner_id", owner)
      .not("encrypted_tokens", "is", null)
      .limit(3);
    if (error) throw Error("Unavailable");
    // No AI calls, public scraping, posting or DMs. Three accounts, 25 posts each.
    for (const account of data ?? []) await syncAccount(owner, account.id);
    await db
      .from("social_oauth_states")
      .delete()
      .lt("expires_at", new Date().toISOString());
    return Response.json({ checked: data?.length ?? 0 }, { headers });
  } catch {
    return Response.json(
      { error: "Social refresh needs attention" },
      { status: 503, headers },
    );
  }
}
