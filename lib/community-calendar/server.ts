import { myCommunityRoles } from "@/lib/communities/server";
import { founderPersona } from "@/lib/communities/model";
import { isOwnerUser } from "@/lib/admin-policy";
import "server-only";
import { requireAssignedUser } from "@/lib/app-access";
import { supabaseAdmin } from "@/lib/supabase-server";
import { expandMonth, type CalendarRecord } from "./ical";
import {
  filterCalendarEvents,
  calendarView,
  isPersona,
  type Persona,
} from "./personas";
export async function loadCommunityCalendar(month: string, preview?: string) {
  const user = await requireAssignedUser();
  if (!user) throw new Error("Sign-in required");
  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("community_calendar_memberships")
    .select("persona")
    .eq("user_id", user.id)
    .maybeSingle();
  if (membershipError) throw new Error("Calendar membership unavailable");
  const scopedPersona = founderPersona(await myCommunityRoles());
  const persona: Persona =
    scopedPersona ??
    (isPersona(membership?.persona) ? membership.persona : "Guest");
  const canManage = isOwnerUser(user);
  const viewingAs = calendarView(persona, canManage, preview);
  const access = { persona, viewingAs, canManage };
  const { data: snapshot, error } = await supabaseAdmin
    .from("community_calendar_imports")
    .select("id,imported_at,message_count,record_count")
    .gt("imported_at", "1970-01-01T00:00:00Z")
    .order("imported_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Calendar unavailable");
  if (!snapshot) return { events: [], snapshot: null, ...access };
  const { data, error: recordError } = await supabaseAdmin
    .from("community_calendar_records")
    .select(
      "id,uid,recurrence_id,sequence,revision_at,message_id,received_at,ics",
    )
    .eq("import_id", snapshot.id)
    .range(0, 999);
  if (recordError || !data || data.length !== snapshot.record_count)
    throw new Error("Calendar import incomplete");
  return {
    events: filterCalendarEvents(
      expandMonth(data as CalendarRecord[], month),
      viewingAs,
    ),
    ...access,
    snapshot: {
      imported_at: snapshot.imported_at,
      message_count: snapshot.message_count,
      record_count: snapshot.record_count,
    },
  };
}
