import { z } from "zod";
import { dailyOwner } from "@/lib/daily/server";
import { adminChatOriginAllowed } from "@/lib/admin-chat/model";
import { supabaseAdmin } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
export async function POST(request: Request) {
  const json = (v: unknown, s = 200) =>
    Response.json(v, {
      status: s,
      headers: { "Cache-Control": "private, no-store" },
    });
  if (!adminChatOriginAllowed(request, process.env.NODE_ENV === "development"))
    return json({ error: "Invalid origin" }, 403);
  let owner;
  try {
    owner = await dailyOwner();
  } catch {
    return json({ error: "Owner sign-in required" }, 403);
  }
  const p = z
    .object({ turn_id: z.uuid() })
    .strict()
    .safeParse(await request.json().catch(() => null));
  if (!p.success) return json({ error: "Invalid proposal" }, 400);
  const r = await supabaseAdmin.rpc("apply_admin_chat_proposal", {
    p_owner: owner,
    p_turn: p.data.turn_id,
  });
  if (r.error)
    return json(
      {
        error:
          "Task changed or proposal unavailable. Ask for a fresh proposal.",
      },
      409,
    );
  revalidatePath("/admin", "layout");
  return json({ task_id: r.data });
}
