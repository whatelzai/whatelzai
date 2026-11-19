import "server-only";
import { requireAssignedUser } from "@/lib/app-access";
import { supabaseAdmin } from "@/lib/supabase-server";
import { cultureFromRows } from "./model";
export async function loadCulture() {
  await requireAssignedUser();
  const collections = await supabaseAdmin
    .from("member_knowledge_collections")
    .select("id,title,metadata")
    .eq("kind", "culture")
    .eq("published", true)
    .order("position")
    .order("id");
  if (collections.error) throw Error("Culture library unavailable.");
  if (!collections.data?.length) return [];
  const entries: {
    id: string;
    collection_id: string;
    body: string;
    metadata: unknown;
  }[] = [];
  // Paginate rather than silently losing content at the Data API row cap.
  for (let page = 0; ; page++) {
    const result = await supabaseAdmin
      .from("member_knowledge_entries")
      .select("id,collection_id,body,metadata")
      .in(
        "collection_id",
        collections.data.map((x) => x.id),
      )
      .eq("published", true)
      .order("position")
      .order("id")
      .range(page * 500, page * 500 + 499);
    if (result.error || !result.data)
      throw Error("Culture sayings unavailable.");
    entries.push(...result.data);
    if (result.data.length < 500) break;
    if (page >= 19)
      throw Error("Culture library is too large to load completely.");
  }
  return cultureFromRows(collections.data, entries);
}
