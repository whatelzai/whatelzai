import { weosAccess } from "./weos-role-server";
import "server-only";
import { cache } from "react";
import { ensureUserRow } from "@/lib/users";
import { hasTeamAssignment } from "@/lib/team-assignment";

export const requireAssignedUser = cache(async () => {
  const user = await ensureUserRow();
  if ((await weosAccess()).preview)
    throw Error("Role preview does not open private account data");
  if (!user?.supabase_auth_user_id || !user.email)
    throw Error("Sign in to continue.");
  if (
    (await weosAccess()).actual === "guest" ||
    !(await hasTeamAssignment(user.id))
  )
    throw Error("Your account is awaiting a tree assignment.");
  return user;
});
