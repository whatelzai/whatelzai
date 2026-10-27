import { ensureUserRow } from "@/lib/users";
import { isOwnerUser } from "@/lib/admin-policy";
import { supabaseAdmin as db } from "@/lib/supabase-server";
import { personalFocusSchema, currentFocusWeek } from "@/lib/personal/model";
export const dynamic = "force-dynamic";
const reply = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
function host(request: Request) {
  const h = new URL(request.url).hostname;
  return (
    h === "admin.whatelz.ai" ||
    (process.env.VERCEL_ENV !== "production" &&
      ["localhost", "admin.localhost", "127.0.0.1"].includes(h))
  );
}
export async function POST(request: Request) {
  if (
    !host(request) ||
    request.headers.get("origin") !== new URL(request.url).origin ||
    !request.headers.get("content-type")?.startsWith("application/json")
  )
    return reply({ error: "Same-origin Admin request required." }, 403);
  const user = await ensureUserRow();
  if (!isOwnerUser(user))
    return reply({ error: "Owner access required." }, 403);
  if (Number(request.headers.get("content-length") || 0) > 4096)
    return reply({ error: "Request too large." }, 413);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > 4096)
    return reply({ error: "Request too large." }, 413);
  let parsed;
  try {
    parsed = personalFocusSchema.safeParse(JSON.parse(raw));
  } catch {
    return reply({ error: "Invalid request." }, 400);
  }
  if (!parsed.success)
    return reply(
      { error: "Choose an area and one outcome of up to 240 characters." },
      400,
    );
  const f = parsed.data;
  if (!currentFocusWeek(f.week_of))
    return reply(
      { error: "The week changed. Keep your text and refresh before saving." },
      409,
    );
  const values = {
    owner_id: user!.id,
    week_of: f.week_of,
    title: f.title,
    area: f.area,
    done: f.done,
    revision: f.revision + 1,
    updated_at: new Date().toISOString(),
  };
  const table = db.from("personal_weekly_focus");
  const query =
    f.revision === 0
      ? table.insert(values)
      : table
          .update(values)
          .eq("owner_id", user!.id)
          .eq("week_of", f.week_of)
          .eq("revision", f.revision);
  const result = await query
    .select("week_of,title,area,done,revision")
    .maybeSingle();
  if (result.error?.code === "23505" || (!result.error && !result.data))
    return reply(
      { error: "This outcome changed elsewhere. Keep your text and refresh." },
      409,
    );
  if (result.error)
    return reply(
      {
        error:
          "Save could not be confirmed. Your text is kept; refresh before retrying.",
      },
      503,
    );
  return reply({ focus: result.data });
}
