import { z } from "zod";
import { requireAssignedUser } from "@/lib/app-access";
import { supabaseAdmin } from "@/lib/supabase-server";
import { chatImagePath } from "@/lib/member-ai/images";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  try {
    const user = await requireAssignedUser();
    const { id } = await params;
    if (!z.uuid().safeParse(id).success)
      return new Response(null, { status: 404, headers });
    const row = await supabaseAdmin
      .from("member_ai_images")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (row.error || !row.data)
      return new Response(null, { status: 404, headers });
    const file = await supabaseAdmin.storage
      .from("chat-images")
      .download(chatImagePath(user.id, id));
    if (file.error || !file.data)
      return new Response(null, { status: 404, headers });
    return new Response(file.data, {
      headers: { ...headers, "Content-Type": "image/webp" },
    });
  } catch {
    return new Response(null, { status: 403, headers });
  }
}
