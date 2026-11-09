import "server-only";
import { getVerifiedAuthUser } from "./supabase/auth-server";
import { supabaseAdmin } from "./supabase-server";
import { isOwnerUser } from "./admin-policy";
import { EVENT_KEY } from "./event-tickets";
export async function eventStaff() {
  const auth = await getVerifiedAuthUser();
  if (!auth) return null;
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("id,role")
    .eq("supabase_auth_user_id", auth.id)
    .maybeSingle();
  if (error || !user) return null;
  if (isOwnerUser(user)) return user;
  const { data: staff, error: staffError } = await supabaseAdmin
    .from("event_staff")
    .select("user_id")
    .eq("event_key", EVENT_KEY)
    .eq("user_id", user.id)
    .maybeSingle();
  return !staffError && staff ? user : null;
}
