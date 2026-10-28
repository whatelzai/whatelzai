import { ensureUserRow } from "@/lib/users";
import { isOwnerUser } from "@/lib/admin-policy";
import { supabaseAdmin as db } from "@/lib/supabase-server";
import { toolsData } from "@/lib/personal-tools/server";
import { allocate, saveSchema } from "@/lib/personal-tools/model";
import { singaporeDay } from "@/lib/daily/model";
export const dynamic = "force-dynamic";
const reply = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
function toolsHost(request: Request) {
  const h = new URL(request.url).hostname;
  return (
    h === "admin.whatelz.ai" ||
    (process.env.VERCEL_ENV !== "production" &&
      ["localhost", "127.0.0.1", "admin.localhost"].includes(h))
  );
}
async function owner(request: Request) {
  if (!toolsHost(request)) return null;
  const u = await ensureUserRow();
  return isOwnerUser(u) ? u!.id : null;
}
export async function GET(request: Request) {
  const id = await owner(request);
  if (!id) return reply({ error: "Owner access required." }, 403);
  try {
    return reply(await toolsData(id));
  } catch {
    return reply({ error: "Could not load personal records. Retry." }, 503);
  }
}
export async function POST(request: Request) {
  if (
    !toolsHost(request) ||
    request.headers.get("origin") !== new URL(request.url).origin ||
    !request.headers.get("content-type")?.startsWith("application/json")
  )
    return reply({ error: "Same-origin Admin request required." }, 403);
  const id = await owner(request);
  if (!id) return reply({ error: "Owner access required." }, 403);
  if (Number(request.headers.get("content-length") || 0) > 20000)
    return reply({ error: "Request too large." }, 413);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > 20000)
    return reply({ error: "Request too large." }, 413);
  let c;
  try {
    c = saveSchema.parse(JSON.parse(raw));
  } catch {
    return reply({ error: "Check your date and session details." }, 400);
  }
  if (c.occurred_on > singaporeDay())
    return reply({ error: "Use today or an earlier date." }, 400);
  let data: unknown = c.data;
  try {
    if (c.data.kind === "payday") {
      const p = c.data;
      const [income, plan] = await Promise.all([
        db
          .from("personal_money_entries")
          .select("amount_minor,occurred_on")
          .eq("owner_id", id)
          .eq("id", p.income_id)
          .eq("kind", "income")
          .eq("category", "Working income")
          .eq("currency", "SGD")
          .eq("voided", false)
          .maybeSingle(),
        db
          .from("personal_money_plan")
          .select("*")
          .eq("owner_id", id)
          .maybeSingle(),
      ]);
      if (income.error || plan.error) throw Error("Read failed");
      if (!income.data || !plan.data || c.id !== p.income_id)
        return reply({ error: "Choose an active SGD salary entry." }, 400);
      try {
        data = {
          ...p,
          amount_minor: income.data.amount_minor,
          allocations: allocate(
            income.data.amount_minor,
            p.tax_minor,
            plan.data,
          ),
        };
      } catch {
        return reply({ error: "Review tax and the jar plan." }, 400);
      }
    }
    const result = await db.rpc("personal_tool_save", {
      p_owner: id,
      p_id: c.id,
      p_kind: c.data.kind,
      p_day: c.occurred_on,
      p_data: data,
      p_revision: c.revision,
    });
    if (result.error || !result.data?.[0])
      return reply(
        {
          error:
            result.error?.code === "40001"
              ? "Changed elsewhere. Reload before saving."
              : "Save could not be confirmed. Retry the same record.",
        },
        result.error?.code === "40001" ? 409 : 503,
      );
    return reply({ record: result.data?.[0] });
  } catch {
    return reply(
      { error: "Save could not be confirmed. Your form is kept." },
      503,
    );
  }
}
