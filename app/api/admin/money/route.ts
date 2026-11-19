import { ensureUserRow } from "@/lib/users";
import { isOwnerUser } from "@/lib/admin-policy";
import { supabaseAdmin as db } from "@/lib/supabase-server";
import { moneyData, exportEntries } from "@/lib/money/server";
import {
  commandSchema,
  csvCell,
  monthRange,
  singaporeDay,
} from "@/lib/money/model";
export const dynamic = "force-dynamic";
const reply = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
function moneyHost(request: Request) {
  const h = new URL(request.url).hostname;
  return (
    h === "admin.whatelz.ai" ||
    (process.env.VERCEL_ENV !== "production" &&
      (h === "localhost" ||
        h === "127.0.0.1" ||
        h === "admin.localhost" ||
        h.endsWith(".vercel.app")))
  );
}
async function owner(request: Request) {
  if (!moneyHost(request)) return null;
  const user = await ensureUserRow();
  return isOwnerUser(user) ? user!.id : null;
}
export async function GET(request: Request) {
  const id = await owner(request);
  if (!id) return reply({ error: "Owner access required." }, 403);
  const params = new URL(request.url).searchParams;
  const month = params.get("month") || singaporeDay().slice(0, 7);
  const includeVoided = params.get("include_voided") ?? "1";
  if (!["0", "1"].includes(includeVoided))
    return reply({ error: "Invalid history filter." }, 400);
  const rawPage = params.get("page") ?? "0";
  if (!/^\d{1,6}$/.test(rawPage)) return reply({ error: "Invalid page." }, 400);
  try {
    monthRange(month);
  } catch {
    return reply({ error: "Invalid month." }, 400);
  }
  try {
    if (params.get("export") === "csv") {
      const rows = await exportEntries(id, month);
      const fields = [
        "id",
        "occurred_on",
        "kind",
        "description",
        "category",
        "scope",
        "currency",
        "amount_minor",
        "account",
        "jar",
        "to_currency",
        "to_amount_minor",
        "to_account",
        "to_jar",
        "voided",
        "recurring_id",
        "recurring_due",
      ] as const;
      const csv = [
        fields.join(","),
        ...rows.map((row) => fields.map((k) => csvCell(row[k])).join(",")),
      ].join("\r\n");
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="money-${month}.csv"`,
          "Cache-Control": "private, no-store",
        },
      });
    }
    return reply(
      await moneyData(id, month, Number(rawPage), includeVoided === "1"),
    );
  } catch {
    return reply(
      { error: "Money records are temporarily unavailable. Please retry." },
      503,
    );
  }
}
export async function POST(request: Request) {
  if (!moneyHost(request)) return reply({ error: "Admin host required." }, 403);
  if (
    request.headers.get("origin") !== new URL(request.url).origin ||
    !request.headers.get("content-type")?.startsWith("application/json")
  )
    return reply({ error: "Same-origin JSON required." }, 403);
  const ownerId = await owner(request);
  if (!ownerId) return reply({ error: "Owner access required." }, 403);
  if (Number(request.headers.get("content-length") || 0) > 8192)
    return reply({ error: "Request too large." }, 413);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > 8192)
    return reply({ error: "Request too large." }, 413);
  let input;
  try {
    input = commandSchema.safeParse(JSON.parse(raw));
  } catch {
    return reply({ error: "Invalid JSON." }, 400);
  }
  if (!input.success)
    return reply(
      { error: input.error.issues[0]?.message || "Invalid entry." },
      400,
    );
  const c = input.data;
  try {
    if (c.action === "entry") {
      const result = await db
        .from("personal_money_entries")
        .insert({ ...c.entry, owner_id: ownerId });
      if (result.error?.code === "23505") {
        const old = await db
          .from("personal_money_entries")
          .select("*")
          .eq("owner_id", ownerId)
          .eq("id", c.entry.id)
          .single();
        if (
          old.error ||
          !Object.entries(c.entry).every(([k, v]) => old.data[k] === v)
        )
          return reply(
            {
              error:
                "This save identifier was already used. Reload before making a different entry.",
            },
            409,
          );
      } else if (result.error) throw result.error;
    } else if (c.action === "recurring") {
      const result = await db
        .from("personal_money_recurring")
        .insert({ ...c.rule, owner_id: ownerId });
      if (result.error?.code === "23505") {
        const old = await db
          .from("personal_money_recurring")
          .select("*")
          .eq("owner_id", ownerId)
          .eq("id", c.rule.id)
          .single();
        if (
          old.error ||
          !Object.entries(c.rule).every(([k, v]) => old.data[k] === v)
        )
          return reply(
            { error: "Recurring rule changed. Reload before retrying." },
            409,
          );
      } else if (result.error) throw result.error;
    } else if (c.action === "entry_date") {
      const result = await db
        .from("personal_money_entries")
        .update({ occurred_on: c.occurred_on })
        .eq("owner_id", ownerId)
        .eq("id", c.id)
        .eq("occurred_on", c.expected_date)
        .eq("voided", false)
        .select("id");
      if (result.error) throw result.error;
      if (!result.data.length)
        return reply(
          {
            error:
              "This entry changed or was voided. Refresh before editing its date.",
          },
          409,
        );
    } else if (c.action === "void") {
      const result = await db
        .from("personal_money_entries")
        .update({ voided: c.voided })
        .eq("owner_id", ownerId)
        .eq("id", c.id)
        .select("id");
      if (result.error) throw result.error;
      if (!result.data.length) return reply({ error: "Entry not found." }, 404);
    } else if (c.action === "recurring_status") {
      const result = await db
        .from("personal_money_recurring")
        .update({ active: c.active })
        .eq("owner_id", ownerId)
        .eq("id", c.id)
        .select("id");
      if (result.error) throw result.error;
      if (!result.data.length)
        return reply({ error: "Recurring expense not found." }, 404);
    } else {
      const result = await db.rpc("personal_money_record_bill", {
        p_owner: ownerId,
        p_rule: c.id,
        p_request: c.request_id,
        p_due: c.expected_due,
        p_paid: c.paid_on,
        p_amount: c.amount_minor,
      });
      if (result.error)
        return reply(
          {
            error:
              "Bill changed or was already recorded. Refresh before trying again.",
          },
          409,
        );
    }
    return reply({ saved: true });
  } catch {
    return reply(
      {
        error: "Save could not be confirmed. Your input is kept; retry safely.",
      },
      503,
    );
  }
}
