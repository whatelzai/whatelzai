import "server-only";
import { sharedLeadIds, sharedLeadColumns } from "./sharing";
import { requireAssignedUser } from "@/lib/app-access";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
  regions,
  stages,
  type Lead,
  type LeadSummary,
  type Activity,
  todayUtc8,
} from "./model";

export async function leadOwner() {
  const user = await requireAssignedUser();
  if (!user) throw new Error("Sign in to manage your leads.");
  return user.id;
}
export async function loadLeads(params: {
  q?: string;
  region?: string;
  stage?: string;
  page?: string;
}) {
  const owner = await leadOwner();
  const q = (params.q ?? "").trim().slice(0, 160);
  const region = regions.find((value) => value === params.region);
  const stage = stages.find((value) => value === params.stage);
  const page = /^[1-9]\d{0,4}$/.test(params.page ?? "")
    ? Number(params.page)
    : 1;
  let query = supabaseAdmin
    .from("member_leads")
    .select(
      "id,name,region,membership,stage,goal,next_action,follow_up_on,is_priority,photo_path,updated_at",
      {
        count: "exact",
      },
    )
    .eq("owner_id", owner);
  if (q) query = query.ilike("name", `%${q.replace(/[\\%_]/g, "\\$&")}%`);
  if (region) query = query.eq("region", region);
  if (stage) query = query.eq("stage", stage);
  const { data, error, count } = await query
    .order("is_priority", { ascending: false })
    .order("follow_up_on", { ascending: true, nullsFirst: false })
    .order("name")
    .order("id")
    .range((page - 1) * 50, page * 50 - 1);
  if (error) throw new Error("Your leads could not be loaded.");
  const leads = (data ?? []).map(({ photo_path, ...lead }) => ({
    ...lead,
    has_photo: Boolean(photo_path),
  })) as LeadSummary[];
  const activityResult = leads.length
    ? await supabaseAdmin
        .from("member_lead_activities")
        .select("lead_id,title,activity_on,status")
        .eq("owner_id", owner)
        .in(
          "lead_id",
          leads.map((lead) => lead.id),
        )
        .gte("activity_on", todayUtc8())
        .in("status", ["Planned", "Tentative", "To invite"])
        .order("activity_on")
        .order("id")
        .limit(1001)
    : { data: [], error: null };
  const plansUnavailable = Boolean(
    activityResult.error || (activityResult.data?.length ?? 0) > 1000,
  );
  return {
    leads,
    upcoming: plansUnavailable
      ? []
      : ((activityResult.data ?? []) as Pick<
          Activity,
          "lead_id" | "title" | "activity_on" | "status"
        >[]),
    plansUnavailable,
    count: count ?? 0,
    page,
    q,
    region: region ?? "",
    stage: stage ?? "",
  };
}
export async function leadAccess(id: string) {
  const viewer = await leadOwner();
  const own = await supabaseAdmin
    .from("member_leads")
    .select("id,owner_id,photo_path")
    .eq("id", id)
    .eq("owner_id", viewer)
    .maybeSingle();
  if (own.error) throw Error("Profile access unavailable.");
  if (own.data) return { ...own.data, canEdit: true };
  const grant = (await sharedLeadIds(viewer)).find((x) => x.id === id);
  if (!grant) return null;
  const row = await supabaseAdmin
    .from("member_leads")
    .select("id,owner_id,photo_path")
    .eq("id", id)
    .eq("owner_id", grant.owner_id)
    .maybeSingle();
  if (row.error) throw Error("Profile access unavailable.");
  return row.data ? { ...row.data, canEdit: false } : null;
}
export async function loadLead(id: string) {
  const access = await leadAccess(id);
  if (!access) return null;
  const [profile, history] = await Promise.all([
    supabaseAdmin
      .from("member_leads")
      .select(
        access.canEdit
          ? "id,name,region,membership,stage,goal,email,phone,birthday,zodiac,relationship,story,interests,concerns,notes,next_action,follow_up_on,is_priority,revision,updated_at,photo_path,visibility"
          : sharedLeadColumns,
      )
      .eq("owner_id", access.owner_id)
      .eq("id", id)
      .maybeSingle(),
    supabaseAdmin
      .from("member_lead_activities")
      .select(
        access.canEdit
          ? "id,lead_id,title,activity_on,status,notes,revision"
          : "id,lead_id,title,activity_on,status",
      )
      .eq("owner_id", access.owner_id)
      .eq("lead_id", id)
      .order("activity_on", { ascending: false })
      .order("id")
      .limit(501),
  ]);
  if (profile.error) throw Error("This profile could not be loaded.");
  if (!profile.data) return null;
  const { photo_path, ...fields } = profile.data as unknown as Partial<Lead> & {
    photo_path: string | null;
  };
  const lead = {
    email: "",
    phone: "",
    birthday: null,
    zodiac: "",
    relationship: "",
    notes: "",
    revision: 0,
    ...fields,
    has_photo: Boolean(photo_path),
  } as Lead;
  if (history.error) throw Error("Activity history unavailable.");
  return {
    lead,
    canEdit: access.canEdit,
    activities: (history.data ?? []) as unknown as Activity[],
    historyLimited: (history.data?.length ?? 0) > 500,
  };
}
