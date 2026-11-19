import { randomUUID } from "node:crypto";
import { z } from "zod";
import { memberActor, memberApiEnabled } from "@/lib/member-ai/server";
import { memberOriginAllowed } from "@/lib/member-ai/http";
import { limitedForm, MAX_UPLOAD_BYTES } from "@/lib/member-ai/media";
import { prepareChatImage, chatImagePath } from "@/lib/member-ai/images";
import { supabaseAdmin } from "@/lib/supabase-server";
export const maxDuration = 30;
export async function POST(request: Request) {
  const json = (body: unknown, status = 200) =>
    Response.json(body, {
      status,
      headers: { "Cache-Control": "private, no-store" },
    });
  if (!memberOriginAllowed(request) || !memberApiEnabled())
    return json({ error: "Open Chat on app.whatelz.ai." }, 403);
  try {
    const { user } = await memberActor();
    const form = await limitedForm(request, MAX_UPLOAD_BYTES + 16384);
    const convo = z.uuid().safeParse(form.get("conversationId"));
    const file = form.get("image");
    if (!convo.success || !(file instanceof File))
      return json({ error: "Choose an image." }, 400);
    const bytes = await prepareChatImage(Buffer.from(await file.arrayBuffer()));
    const id = randomUUID();
    const row = await supabaseAdmin.rpc("register_member_image", {
      p_user: user.id,
      p_conversation: convo.data,
      p_id: id,
    });
    if (row.error)
      return json(
        {
          error: row.error.message.includes("limit")
            ? "Image limit reached. Try again tomorrow."
            : "Conversation unavailable.",
        },
        409,
      );
    const uploaded = await supabaseAdmin.storage
      .from("chat-images")
      .upload(chatImagePath(user.id, id), bytes, {
        contentType: "image/webp",
        upsert: false,
      });
    if (uploaded.error) {
      await supabaseAdmin
        .from("member_ai_images")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)
        .is("request_id", null);
      return json({ error: "Image could not be uploaded." }, 503);
    }
    return json({ id });
  } catch {
    return json(
      { error: "Choose a valid JPG, PNG or WebP image under 3 MB." },
      400,
    );
  }
}
