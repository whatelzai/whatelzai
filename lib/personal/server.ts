import "server-only";
import { supabaseAdmin as db } from "@/lib/supabase-server";
import { emdeeConnection } from "@/lib/daily/connections";
import { loadBriefWithConnection } from "@/lib/daily/emdee";
import { readEmdee } from "@/lib/daily/emdee-client";
import { previousWeek } from "@/lib/daily/weekly-model";
import { DAILY_PARENT } from "@/lib/daily/paths";
import { loadMandala } from "@/lib/mandala-server";
import type { Source } from "@/lib/admin-overview/model";
import type { PersonalFocus } from "./model";
import type { MoneyPlan, Rule } from "@/lib/money/model";
async function safe<T>(read: () => Promise<T>): Promise<Source<T>> {
  try {
    return { status: "ready", data: await read() };
  } catch {
    return { status: "unavailable" };
  }
}
/** The page must verify the owner before starting any sources. No work-task reads or mutations. */
export function personalSources(
  owner: string,
  day: string,
  week: string,
  now: Date,
) {
  const connection = emdeeConnection(owner);
  const connected = async () => {
    const c = await connection;
    if (c?.parentPath !== DAILY_PARENT) throw Error("Daily unavailable");
    return c;
  };
  return {
    direction: loadMandala(),
    focus: safe(async () => {
      const r = await db
        .from("personal_weekly_focus")
        .select("week_of,title,area,done,revision")
        .eq("owner_id", owner)
        .eq("week_of", week)
        .maybeSingle();
      if (r.error) throw r.error;
      return r.data as PersonalFocus | null;
    }),
    money: safe(async () => {
      const [plan, bills] = await Promise.all([
        db
          .from("personal_money_plan")
          .select(
            "jar_base_minor,tax_minor,reserve_target_minor,income_account,jar_plan",
          )
          .eq("owner_id", owner)
          .maybeSingle(),
        db
          .from("personal_money_recurring")
          .select("id,name,amount_minor,currency,next_due")
          .eq("owner_id", owner)
          .eq("active", true)
          .order("next_due")
          .order("id")
          .limit(3),
      ]);
      if (plan.error || bills.error) throw Error("Money unavailable");
      return {
        plan: plan.data as MoneyPlan | null,
        bills: bills.data as Pick<
          Rule,
          "id" | "name" | "amount_minor" | "currency" | "next_due"
        >[],
      };
    }),
    morning: safe(async () =>
      loadBriefWithConnection(await connected(), day, "morning"),
    ),
    evening: safe(async () =>
      loadBriefWithConnection(await connected(), day, "evening"),
    ),
    weekly: safe(async () => {
      const doc = await readEmdee(await connected(), previousWeek(now).path);
      return !!doc?.content
        ?.split(/^## Notes\s*$/m)[1]
        ?.split(/^## /m)[0]
        ?.trim();
    }),
  };
}
