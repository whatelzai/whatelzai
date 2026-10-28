import "server-only";
import { supabaseAdmin as db } from "@/lib/supabase-server";
import { currentWeek } from "@/lib/admin-week";
import { singaporeDay } from "@/lib/daily/model";
import type { ToolRecord, ToolsData } from "./model";
export async function toolsData(
  owner: string,
  day = singaporeDay(),
): Promise<ToolsData> {
  const week = currentWeek(day);
  const records: ToolRecord[] = [];
  // Recent 90 days plus all saved routines; paginate before aggregation.
  const since = new Date(Date.parse(day + "T00:00:00Z") - 90 * 86400000)
    .toISOString()
    .slice(0, 10);
  const [plan, incomes, focus] = await Promise.all([
    db
      .from("personal_money_plan")
      .select(
        "jar_base_minor,tax_minor,reserve_target_minor,income_account,jar_plan",
      )
      .eq("owner_id", owner)
      .maybeSingle(),
    db
      .from("personal_money_entries")
      .select("id,occurred_on,amount_minor,description")
      .eq("owner_id", owner)
      .eq("kind", "income")
      .eq("category", "Working income")
      .eq("currency", "SGD")
      .eq("voided", false)
      .order("occurred_on", { ascending: false })
      .order("id")
      .limit(24),
    db
      .from("personal_weekly_focus")
      .select("title,done")
      .eq("owner_id", owner)
      .eq("week_of", week.start)
      .maybeSingle(),
  ]);
  if (plan.error || incomes.error || focus.error)
    throw Error("Personal tools unavailable");
  for (let offset = 0; ; offset += 500) {
    const r = await db
      .from("personal_tool_records")
      .select("id,revision,occurred_on,kind,data")
      .eq("owner_id", owner)
      .or(`occurred_on.gte.${since},kind.eq.routine`)
      .order("occurred_on", { ascending: false })
      .order("id")
      .range(offset, offset + 499);
    if (r.error) throw r.error;
    records.push(...(r.data as ToolRecord[]));
    if (r.data.length < 500) break;
  }
  const spend = new Map<string, number>();
  for (let offset = 0; ; offset += 500) {
    const r = await db
      .from("personal_money_entries")
      .select("currency,amount_minor,kind")
      .eq("owner_id", owner)
      .eq("voided", false)
      .gte("occurred_on", week.start)
      .lte("occurred_on", week.end)
      .in("kind", ["expense", "refund"])
      .order("id")
      .range(offset, offset + 499);
    if (r.error) throw r.error;
    for (const e of r.data)
      spend.set(
        e.currency,
        (spend.get(e.currency) || 0) +
          e.amount_minor * (e.kind === "refund" ? -1 : 1),
      );
    if (r.data.length < 500) break;
  }
  return {
    records,
    plan: plan.data,
    incomes: incomes.data,
    week,
    focus: focus.data,
    spending: [...spend].map(([currency, minor]) => ({ currency, minor })),
  };
}
