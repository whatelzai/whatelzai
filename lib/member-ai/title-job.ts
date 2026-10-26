import type { SupabaseClient } from "@supabase/supabase-js";
import { generateTitle } from "./title";
export async function runTitleJob(
  db: Pick<SupabaseClient, "rpc">,
  user: string,
  conversation: string,
  key: string,
) {
  const claim = await db.rpc("claim_member_ai_title", {
    p_user: user,
    p_conversation: conversation,
  });
  if (claim.error) throw Error("Title claim unavailable");
  if (!claim.data) return "skipped";
  const receipt = await generateTitle(key, claim.data);
  const saved = await db.rpc("finish_member_ai_title", {
    p_user: user,
    p_conversation: conversation,
    p_title: receipt.title,
    p_status: receipt.status,
    p_input: receipt.input,
    p_output: receipt.output,
    p_charge: receipt.charge,
  });
  if (saved.error)
    throw Error("Title result could not be recorded; do not retry inference");
  return receipt.status;
}
