import { dailyOwner } from "@/lib/daily/server";
import { supabaseAdmin as db } from "@/lib/supabase-server";
import { adminChatOriginAllowed } from "@/lib/admin-chat/model";
import { syncAdminNotices } from "@/lib/admin-notifications/server";
import { z } from "zod";
const json = (v: unknown, s = 200) =>
  Response.json(v, {
    status: s,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function GET(request: Request) {
  let owner;
  try {
    owner = await dailyOwner();
  } catch {
    return json({ error: "Owner sign-in required" }, 403);
  }
  try {
    if (new URL(request.url).searchParams.get("poll") !== "1")
      await syncAdminNotices(owner);
    const r = await db
      .from("admin_notifications")
      .select("id,title,body,url,created_at,read_at")
      .eq("owner_id", owner)
      .not("source_key", "like", "push:focus-%")
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(100);
    const count = await db
      .from("admin_notifications")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", owner)
      .not("source_key", "like", "push:focus-%")
      .is("archived_at", null)
      .is("read_at", null);
    if (r.error || count.error) throw Error();
    return json({ notices: r.data, unread: count.count });
  } catch {
    return json({ error: "Notifications could not be loaded." }, 503);
  }
}
export async function PATCH(request: Request) {
  if (!adminChatOriginAllowed(request, process.env.NODE_ENV === "development"))
    return json({ error: "Invalid origin" }, 403);
  let owner;
  try {
    owner = await dailyOwner();
  } catch {
    return json({ error: "Owner sign-in required" }, 403);
  }
  const p = z
    .object({
      action: z.enum(["read", "read-all", "archive"]),
      id: z.uuid().optional(),
    })
    .safeParse(await request.json().catch(() => null));
  if (!p.success || (p.data.action !== "read-all" && !p.data.id))
    return json({ error: "Invalid action" }, 400);
  let q = db
    .from("admin_notifications")
    .update(
      p.data.action === "archive"
        ? { archived_at: new Date().toISOString() }
        : { read_at: new Date().toISOString() },
    )
    .eq("owner_id", owner);
  if (p.data.action === "read-all") q = q.is("read_at", null);
  else q = q.eq("id", p.data.id!);
  const r = await q;
  return r.error
    ? json({ error: "Could not update notification" }, 503)
    : json({ ok: true });
}
