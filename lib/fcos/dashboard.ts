import "server-only";
import { fcosOwner } from "./server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { loadCommunityCalendar } from "@/lib/community-calendar/server";
import { todayUtc8 } from "@/lib/leads/model";
import { futureEvents } from "./model";
import { attentionItems, nextMonth } from "./attention";

// Own records only. Calendar independently verifies the signed-in membership.
// This loader never invokes the assistant or a provider API.
export async function loadAttentionDashboard() {
  const owner = await fcosOwner();
  const now = new Date();
  const today = todayUtc8(now);
  const month = today.slice(0, 7);
  const [leads, tasks, notes, ...calendars] = await Promise.all([
    supabaseAdmin
      .from("member_leads")
      .select("id,name,next_action,follow_up_on", { count: "exact" })
      .eq("owner_id", owner)
      .not("stage", "in", '(ABO,APC,"Not now")')
      .lte("follow_up_on", today)
      .order("follow_up_on")
      .order("id")
      .limit(5),
    supabaseAdmin
      .from("daily_tasks")
      .select("id,title,due_on,status", { count: "exact" })
      .eq("owner_id", owner)
      .in("status", ["open", "blocked", "waiting"])
      .not("accepted_on", "is", null)
      .or(`status.in.(blocked,waiting),due_on.lte.${today}`)
      .order("due_on", { nullsFirst: false })
      .order("id")
      .limit(5),
    supabaseAdmin
      .from("member_briefings")
      .select("id,kind,title,occurred_on", { count: "exact" })
      .eq("owner_id", owner)
      .eq("status", "draft")
      .order("updated_at", { ascending: false })
      .order("id")
      .limit(3),
    ...[month, nextMonth(month)].map((value) =>
      loadCommunityCalendar(value).catch(() => null),
    ),
  ]);
  const events = calendars.flatMap((calendar) => calendar?.events ?? []);
  const upcoming = futureEvents(
    [...new Map(events.map((event) => [event.id, event])).values()],
    now,
  )
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 3);
  return {
    today,
    items: attentionItems(
      leads.error ? [] : (leads.data ?? []),
      tasks.error ? [] : (tasks.data ?? []),
      today,
    ),
    leads: {
      count: leads.error ? null : (leads.count ?? 0),
      available: !leads.error,
    },
    tasks: {
      count: tasks.error ? null : (tasks.count ?? 0),
      available: !tasks.error,
    },
    notes: {
      count: notes.error ? null : (notes.count ?? 0),
      available: !notes.error,
      items: notes.error ? [] : (notes.data ?? []),
    },
    upcoming,
    calendarAvailable: calendars.every(Boolean),
    importedAt:
      calendars.find((calendar) => calendar?.snapshot)?.snapshot?.imported_at ??
      null,
  };
}
