import "server-only";
import { notFound } from "next/navigation";
import { isOwnerUser } from "@/lib/admin-policy";
import { ensureUserRow } from "@/lib/users";
import { supabaseAdmin } from "@/lib/supabase-server";
import { type Task } from "./model";

export async function dailyOwner() {
  const user = await ensureUserRow();
  if (!isOwnerUser(user)) notFound();
  return user!.id;
}
export async function loadDailyTasks(day: string) {
  const owner = await dailyOwner();
  const [active, completed] = await Promise.all([
    supabaseAdmin
      .from("daily_tasks")
      .select("id,title,lane,due_on,status,revision,accepted_on,completed_at")
      .eq("owner_id", owner)
      .not("status", "in", "(done,dropped)")
      .order("due_on")
      .order("created_at")
      .limit(100),
    supabaseAdmin
      .from("daily_tasks")
      .select("id,title,lane,due_on,status,revision,accepted_on,completed_at")
      .eq("owner_id", owner)
      .eq("completed_on", day)
      .order("completed_at")
      .limit(100),
  ]);
  if (active.error)
    throw Error("Commitments could not be loaded. Please try again.");
  if (completed.error)
    throw Error("Completed commitments could not be loaded.");
  return {
    active: (active.data ?? []) as Task[],
    completed: (completed.data ?? []) as Task[],
  };
}
