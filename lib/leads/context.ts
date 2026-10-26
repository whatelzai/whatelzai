import "server-only";
import { supabaseAdmin } from "@/lib/supabase-server";
import { leadOwner } from "./server";
import { sharedLeadIds, sharedLeadColumns } from "./sharing";
import { sharedBriefingIds } from "@/lib/fcos/sharing";
import { todayUtc8 } from "./model";
export async function readLeadContext(query: string) {
  const viewer = await leadOwner();
  const filter = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
  const own = await supabaseAdmin
    .from("member_leads")
    .select(`${sharedLeadColumns},notes`)
    .eq("owner_id", viewer)
    .ilike("name", filter)
    .order("is_priority", { ascending: false })
    .order("name")
    .order("id")
    .limit(5);
  if (own.error) throw Error("Your leads are unavailable.");
  const allowed = await sharedLeadIds(viewer);
  const shared = allowed.length
    ? await supabaseAdmin
        .from("member_leads")
        .select(sharedLeadColumns)
        .in(
          "id",
          allowed.slice(0, 500).map((x) => x.id),
        )
        .ilike("name", filter)
        .order("name")
        .order("id")
        .limit(5)
    : { data: [], error: null };
  if (shared.error) throw Error("Shared leads are unavailable.");
  const profiles = [
    ...(own.data ?? []).map((x) => ({ ...x, access: "Own profile" })),
    ...(shared.data ?? []).map((x) => ({ ...x, access: "Shared read-only" })),
  ];
  const noteIds = await sharedBriefingIds(viewer);
  const items = await Promise.all(
    profiles.map(async (raw) => {
      const lead = raw as unknown as Record<string, unknown> & {
        id: string;
        story: string;
        notes?: string;
        interests: string;
        concerns: string;
        next_action: string;
        access: string;
      };
      const owner =
        lead.access === "Own profile"
          ? viewer
          : allowed.find((x) => x.id === lead.id)!.owner_id;
      const history = await supabaseAdmin
        .from("member_lead_activities")
        .select("title,activity_on,status")
        .eq("owner_id", owner)
        .eq("lead_id", lead.id)
        .order("activity_on", { ascending: false })
        .order("id")
        .limit(21);
      if (history.error) throw Error("Lead activity history unavailable.");
      const notes = await supabaseAdmin
        .from("member_briefings")
        .select(
          "id,title,kind,status,occurred_on,observations,reflections,next_steps",
        )
        .or(
          `owner_id.eq.${viewer},id.in.(${
            noteIds
              .slice(0, 500)
              .map((x) => x.id)
              .join(",") || "00000000-0000-0000-0000-000000000000"
          })`,
        )
        .contains("lead_ids", [lead.id])
        .order("updated_at", { ascending: false })
        .order("id")
        .limit(3);
      if (notes.error) throw Error("Linked notes unavailable.");
      // Explicit allowlist: no contact data, private activity notes, photo paths,
      // other owner metadata or private chat records enter the tool result.
      return {
        id: lead.id,
        name: lead.name,
        region: lead.region,
        membership: lead.membership,
        stage: lead.stage,
        goal: lead.goal,
        is_priority: lead.is_priority,
        access: lead.access,
        story: lead.story.slice(0, 1200),
        interests: lead.interests.slice(0, 400),
        concerns: lead.concerns.slice(0, 400),
        ...(lead.access === "Own profile"
          ? { notes: lead.notes?.slice(0, 800) }
          : {}),
        next_action: lead.next_action.slice(0, 300),
        follow_up_on: lead.follow_up_on,
        activities: (history.data ?? []).slice(0, 20),
        activityCoverage:
          (history.data?.length ?? 0) > 20
            ? "Latest 20 records; older history omitted"
            : "All recorded activities",
        linkedNotes: (notes.data ?? []).slice(0, 2).map((note) => ({
          id: note.id,
          title: note.title,
          kind: note.kind,
          status: note.status,
          occurred_on: note.occurred_on,
          observations: note.observations.slice(0, 250),
          reflections: note.reflections.slice(0, 250),
          next_steps: note.next_steps.slice(0, 150),
          url: `/briefings/${note.id}`,
        })),
        noteCoverage:
          (notes.data?.length ?? 0) > 2
            ? "Latest 2 permitted linked notes; more available in Resources"
            : "All permitted linked notes (bounded excerpts)",
        url: `/leads/${lead.id}`,
      };
    }),
  );
  return {
    items,
    today: todayUtc8(),
    coverage:
      "Up to 5 own matching leads, priority first, plus 5 explicitly shared matching profiles (first 500 permitted IDs). Text fields are bounded excerpts. Activity statuses are authoritative records: Planned, Tentative and To invite are NOT attendance, even after the date passes. Shared access includes permitted linked HQH/HHH only; contacts, private remarks, activity notes and chats stay private. Hidden profiles and hidden notes are excluded. Follow-up dates are not completion.",
  };
}
