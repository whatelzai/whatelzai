import "server-only";
import { requireAssignedUser } from "@/lib/app-access";
import { supabaseAdmin } from "@/lib/supabase-server";
import { hasNewRelease, releaseCursor, type ReleaseNote } from "./model";

function publishedNotes() {
  return supabaseAdmin
    .from("member_release_notes")
    .select("id,slug,title,body,published_at")
    .eq("published", true)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .order("id", { ascending: false });
}
export async function loadHomeReleaseNotes() {
  const user = await requireAssignedUser();
  const [notes, receipt] = await Promise.all([
    publishedNotes().limit(3),
    supabaseAdmin
      .from("member_release_receipts")
      .select("release_id,seen_published_at")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  if (notes.error || receipt.error) throw Error("Release notes unavailable");
  const releases = (notes.data ?? []) as ReleaseNote[];
  const latest = releases[0];
  return {
    releases,
    show: Boolean(
      latest &&
      hasNewRelease(
        latest,
        receipt.data
          ? {
              id: receipt.data.release_id,
              published_at: receipt.data.seen_published_at,
            }
          : null,
      ),
    ),
  };
}
export async function loadReleaseArchive(before?: string) {
  await requireAssignedUser();
  let query = publishedNotes();
  const cursor = releaseCursor(before);
  if (cursor)
    query = query.or(
      `published_at.lt.${cursor.published_at},and(published_at.eq.${cursor.published_at},id.lt.${cursor.id})`,
    );
  const { data, error } = await query.limit(21);
  if (error) throw Error("Release notes unavailable");
  const rows = (data ?? []) as ReleaseNote[];
  const releases = rows.slice(0, 20);
  return { releases, next: rows.length > 20 ? releases.at(-1)! : null };
}
