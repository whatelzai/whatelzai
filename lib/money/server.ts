import "server-only";
import { supabaseAdmin as db } from "@/lib/supabase-server";
import {
  monthRange,
  type Entry,
  type Rule,
  type MoneyData,
  type MoneyPlan,
} from "./model";
export async function moneyData(
  owner: string,
  month: string,
  page = 0,
): Promise<MoneyData> {
  const { start, end } = monthRange(month);
  const [ledger, plan, summary] = await Promise.all([
    db
      .from("personal_money_entries")
      .select("*", { count: "exact" })
      .eq("owner_id", owner)
      .gte("occurred_on", start)
      .lt("occurred_on", end)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id")
      .range(page * 50, page * 50 + 49),
    db
      .from("personal_money_plan")
      .select(
        "jar_base_minor,tax_minor,reserve_target_minor,income_account,jar_plan",
      )
      .eq("owner_id", owner)
      .maybeSingle(),
    db.rpc("personal_money_summary", {
      p_owner: owner,
      p_start: start,
      p_end: end,
    }),
  ]);
  if (ledger.error || summary.error || plan.error)
    throw Error("Money records could not be loaded.");
  const rules: Rule[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await db
      .from("personal_money_recurring")
      .select("*")
      .eq("owner_id", owner)
      .order("next_due")
      .order("id")
      .range(offset, offset + 499);
    if (result.error) throw Error("Recurring expenses could not be loaded.");
    rules.push(...(result.data as Rule[]));
    if (result.data.length < 500) break;
  }
  return {
    plan: plan.data as MoneyPlan | null,
    entries: ledger.data as Entry[],
    total: ledger.count ?? 0,
    rules,
    summary: summary.data,
  };
}
export async function exportEntries(owner: string, month: string) {
  const { start, end } = monthRange(month);
  const rows: Entry[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await db
      .from("personal_money_entries")
      .select("*")
      .eq("owner_id", owner)
      .gte("occurred_on", start)
      .lt("occurred_on", end)
      .order("occurred_on")
      .order("created_at")
      .order("id")
      .range(offset, offset + 499);
    if (result.error) throw Error("Export unavailable.");
    rows.push(...(result.data as Entry[]));
    if (result.data.length < 500) break;
  }
  return rows;
}
