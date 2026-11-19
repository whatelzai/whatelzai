import "server-only";
import { supabaseAdmin } from "@/lib/supabase-server";
import { runTitleJob } from "./title-job";
export async function titleConversation(
  user: string,
  conversation: string,
  key: string,
) {
  return runTitleJob(supabaseAdmin, user, conversation, key);
}
