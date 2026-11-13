import { dailyOwner } from "@/lib/daily/server";
import { supabaseAdmin as db } from "@/lib/supabase-server";
import {
  inviteWriteInput,
  inviteAdminHost,
  singaporeToday,
} from "@/lib/ai-invites/model";
export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function POST(req: Request) {
  if (
    !inviteAdminHost(req) ||
    req.headers.get("origin") !== new URL(req.url).origin ||
    !req.headers.get("content-type")?.startsWith("application/json")
  )
    return json({ error: "Same-origin Admin request required." }, 403);
  let owner: string;
  try {
    owner = await dailyOwner();
  } catch {
    return json({ error: "Owner access required." }, 403);
  }
  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > 16000)
    return json({ error: "Entry too long." }, 413);
  let input;
  try {
    input = inviteWriteInput.safeParse(JSON.parse(raw));
  } catch {
    return json({ error: "Check the entry and retry." }, 400);
  }
  if (!input.success)
    return json({ error: "Check the names, dates and field lengths." }, 400);
  const { action, revision, ...values } = input.data;
  const table =
    action === "contact" ? "ai_business_contacts" : "ai_business_invitations";
  if (action === "invitation") {
    const f = input.data;
    if (f.invited_on > singaporeToday())
      return json(
        {
          error:
            "Log invitations already made. Use the follow-up date to plan ahead.",
        },
        400,
      );
    const parent = await db
      .from("ai_business_contacts")
      .select("id,status")
      .eq("id", f.contact_id)
      .eq("owner_id", owner)
      .maybeSingle();
    if (parent.error)
      return json({ error: "Contact could not be checked." }, 503);
    if (!parent.data) return json({ error: "Contact not found." }, 404);
    if (parent.data.status === "do_not_contact" && revision === 0)
      return json(
        {
          error:
            "This person is marked Do not contact. Update their preferences before logging a new invitation.",
        },
        409,
      );
  }
  const payload: Record<string, unknown> = {
    ...values,
    ...(action === "contact" ? { email: input.data.email || null } : {}),
    owner_id: owner,
    revision: revision + 1,
    updated_at: new Date().toISOString(),
    ...(action === "contact" && revision === 0
      ? { source_key: `manual:${values.id}` }
      : {}),
  };
  const query =
    revision === 0
      ? db.from(table).insert(payload)
      : db
          .from(table)
          .update(payload)
          .eq("id", values.id)
          .eq("owner_id", owner)
          .eq("revision", revision);
  if (action === "invitation" && revision > 0)
    query.eq("contact_id", input.data.contact_id);
  const result = await query.select("id,revision").maybeSingle();
  if (result.error?.code === "23505")
    return json(
      { error: "This entry or email already exists. Refresh before retrying." },
      409,
    );
  if (result.error)
    return json(
      {
        error:
          "Save could not be confirmed. Your text is kept; refresh before retrying.",
      },
      503,
    );
  if (!result.data)
    return json(
      { error: "This entry changed elsewhere. Keep your text and refresh." },
      409,
    );
  return json({ saved: result.data });
}
