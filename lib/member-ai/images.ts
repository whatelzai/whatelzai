import "server-only";
import { supabaseAdmin } from "@/lib/supabase-server";
import { MAX_CHAT_IMAGE_BYTES, MAX_CONTEXT_IMAGES } from "./media";
export const chatImagePath = (owner: string, id: string) =>
  `${owner}/${id}.webp`;
export { prepareChatImage } from "./image-codec";
export async function modelChatImages(
  owner: string,
  conversation: string,
  staged: string[] = [],
  requestId = "",
) {
  const [past, current] = await Promise.all([
    supabaseAdmin
      .from("member_ai_images")
      .select("id,request_id")
      .eq("user_id", owner)
      .eq("conversation_id", conversation)
      .not("request_id", "is", null)
      .order("created_at", { ascending: false })
      .order("id")
      .limit(MAX_CONTEXT_IMAGES),
    staged.length
      ? supabaseAdmin
          .from("member_ai_images")
          .select("id,request_id")
          .eq("user_id", owner)
          .eq("conversation_id", conversation)
          .in("id", staged)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (past.error || current.error) throw Error("Chat images unavailable.");
  const rows = [...(current.data ?? []), ...(past.data ?? [])]
    .filter(
      (row, index, all) => all.findIndex((x) => x.id === row.id) === index,
    )
    .slice(0, MAX_CONTEXT_IMAGES);
  return Promise.all(
    rows.map(async (image) => {
      const file = await supabaseAdmin.storage
        .from("chat-images")
        .download(chatImagePath(owner, image.id));
      if (file.error || !file.data || file.data.size > MAX_CHAT_IMAGE_BYTES)
        throw Error("Chat image unavailable.");
      return {
        id: image.id,
        requestId: staged.includes(image.id)
          ? requestId
          : (image.request_id as string),
        url: `data:image/webp;base64,${Buffer.from(await file.data.arrayBuffer()).toString("base64")}`,
      };
    }),
  );
}
