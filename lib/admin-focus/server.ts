import "server-only";
import { dailyOwner } from "@/lib/daily/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { loadAdminCalendar } from "@/lib/admin-calendar/server";
import { administrativeFocus, type FocusItem } from "./model";
export async function loadFocusDetail(
  id: string,
): Promise<(FocusItem & { source: string; location?: string }) | null> {
  const owner = await dailyOwner();
  if (id.length > 600) return null;
  if (id.startsWith("task:")) {
    const key = id.slice(5);
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        key,
      )
    )
      return null;
    const { data, error } = await supabaseAdmin
      .from("daily_tasks")
      .select("id,title,lane,due_on,status,accepted_on")
      .eq("owner_id", owner)
      .eq("id", key)
      .maybeSingle();
    if (error) throw Error("Focus unavailable");
    if (!data) return null;
    return {
      id,
      title: data.title,
      lane: data.lane,
      start: data.due_on,
      end: data.due_on,
      kind: "task",
      status: data.status,
      href: "/admin/today#commitments",
      source: data.accepted_on ? "Accepted commitment" : "Proposed commitment",
    };
  }
  if (id.startsWith("routine:")) {
    const date = id.split(":")[2] ?? "";
    const routine = administrativeFocus(date).find((r) => r.id === id);
    return routine
      ? { ...routine, source: "Your rhythm · Asia/Singapore" }
      : null;
  }
  if (!id.startsWith("event:")) return null;
  const { events, unavailable } = await loadAdminCalendar();
  const event = events.find((e) => e.id === id.slice(6));
  if (!event) {
    if (unavailable.length) throw Error("Focus unavailable");
    return null;
  }
  return { ...event, id, kind: "event", href: event.href ?? "/admin/calendar" };
}
