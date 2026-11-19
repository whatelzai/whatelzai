import "server-only";
import { isOwnerUser } from "./admin-policy";
import { cache } from "react";
import { supabaseAdmin } from "./supabase-server";
import { getVerifiedAuthUser } from "./supabase/auth-server";

export type UserRole = "superadmin" | "admin" | "unauthorized";
export interface AppUser {
  id: string;
  supabase_auth_user_id: string;
  email: string;
  role: UserRole;
  name: string | null;
  image_url: string | null;
  first_seen_at: string;
  last_seen_at: string;
}

// Stable internal users.id survives provider changes. No email/name matching,
// role assignment or team linking occurs during sign-in.
export const ensureUserRow = cache(async (): Promise<AppUser | null> => {
  const user = await getVerifiedAuthUser();
  if (!user?.email) return null;
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("users")
    .upsert(
      {
        supabase_auth_user_id: user.id,
        email: user.email.toLowerCase(),
        name:
          typeof user.user_metadata.full_name === "string"
            ? user.user_metadata.full_name
            : null,
        image_url:
          typeof user.user_metadata.avatar_url === "string"
            ? user.user_metadata.avatar_url
            : null,
        last_seen_at: now,
        updated_at: now,
      },
      { onConflict: "supabase_auth_user_id" },
    )
    .select()
    .single();
  if (error) throw new Error(`ensureUserRow: ${error.message}`);
  return data as AppUser;
});

export async function isCurrentUserAdmin(): Promise<boolean> {
  const user = await getVerifiedAuthUser();
  if (!user) return false;
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, role")
    .eq("supabase_auth_user_id", user.id)
    .maybeSingle();
  return !error && isOwnerUser(data);
}
export async function requireAdmin(): Promise<void> {
  if (!(await isCurrentUserAdmin())) throw new Error("Owner access required");
}
