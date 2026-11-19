import { leadAccess } from "@/lib/leads/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { z } from "zod";
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
    const { id } = await params;
    if (!z.uuid().safeParse(id).success)
      return new Response(null, { status: 404, headers });
    const access = await leadAccess(id);
    if (!access?.photo_path)
      return new Response(null, { status: 404, headers });
    const r = await supabaseAdmin.storage
      .from("lead-photos")
      .download(access.photo_path);
    if (r.error || !r.data) return new Response(null, { status: 404, headers });
    return new Response(r.data, {
      headers: { ...headers, "Content-Type": "image/webp" },
    });
  } catch {
    return new Response(null, { status: 403, headers });
  }
}
