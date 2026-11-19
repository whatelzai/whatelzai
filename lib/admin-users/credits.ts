import "server-only";
import { dailyOwner } from "@/lib/daily/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { loadUserDirectory } from "./server";
export type CreditMember = {
  userId: string;
  name: string;
  email: string;
  cycle: string | null;
  allowance: number;
  spent: number;
  reserved: number;
};
export async function loadActivatedCredits(): Promise<CreditMember[]> {
  await dailyOwner();
  const { entries } = await loadUserDirectory();
  const activated = entries.filter((entry) => entry.status === "activated");
  if (!activated.length) return [];
  if (activated.length > 1000)
    throw Error("The reset roster exceeds the current batch limit.");
  const ids = activated.map((entry) => entry.account!.id);
  const access = await supabaseAdmin
    .from("member_ai_access")
    .select("user_id,current_cycle_id")
    .in("user_id", ids)
    .limit(1000);
  if (access.error) throw Error("Credit balances could not be loaded.");
  const cycleIds = (access.data ?? [])
    .map((row) => row.current_cycle_id)
    .filter(Boolean);
  const cycles = cycleIds.length
    ? await supabaseAdmin
        .from("member_ai_cycles")
        .select("id,user_id,allowance_micro,spent_micro,reserved_micro,ends_at")
        .in("id", cycleIds)
        .limit(1000)
    : { data: [], error: null };
  if (cycles.error) throw Error("Credit history could not be loaded.");
  return activated.map((entry) => {
    const stored = access.data?.find(
      (row) => row.user_id === entry.account!.id,
    );
    const cycle = cycles.data?.find(
      (row) =>
        row.id === stored?.current_cycle_id &&
        row.user_id === entry.account!.id,
    );
    if (stored?.current_cycle_id && !cycle)
      throw Error("Credit history is incomplete. Refresh before resetting.");
    const current =
      cycle && Date.parse(cycle.ends_at) > Date.now() ? cycle : null;
    return {
      userId: entry.account!.id,
      name: entry.name,
      email: entry.account!.email!,
      cycle: stored?.current_cycle_id ?? null,
      allowance: Number(current?.allowance_micro ?? 1000000),
      spent: Number(current?.spent_micro ?? 0),
      reserved: Number(current?.reserved_micro ?? 0),
    };
  });
}
