import { isOwnerUser } from "@/lib/admin-policy";
import { ensureUserRow } from "@/lib/users";
import { redirect } from "next/navigation";
import { adminUrl } from "@/lib/admin-url";

export async function GET() {
  const user = await ensureUserRow();
  if (!user) redirect("/sign-in");
  // Signing in syncs a profile; it must never appoint an administrator.
  redirect(isOwnerUser(user) ? adminUrl() : "https://app.whatelz.ai");
}
