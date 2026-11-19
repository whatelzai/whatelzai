import Link from "next/link";
import { dailyOwner } from "@/lib/daily/server";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase-server";
export const dynamic = "force-dynamic";
export default async function ChatReview() {
  await dailyOwner();
  const db = await createAuthClient();
  const result = await db
    .from("member_ai_conversations")
    .select("id,user_id,title,created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (result.error) throw Error("Chat review is unavailable");
  const ids = [...new Set(result.data.map((x) => x.user_id))];
  const people = ids.length
    ? await supabaseAdmin.from("users").select("id,name").in("id", ids)
    : { data: [], error: null };
  if (people.error) throw Error("Member names unavailable");
  return (
    <section className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/community"
        className="inline-flex min-h-11 items-center text-sm"
      >
        ← Community
      </Link>
      <h1 className="text-2xl font-semibold">Chat review</h1>
      <p className="text-sm leading-6 text-zinc-600">
        Beacon-only review for improving weOS. Opening this review does not send
        conversations to an AI or add them to your normal Chat context.
      </p>
      <div className="divide-y divide-zinc-200">
        {result.data.map((c) => (
          <Link
            key={c.id}
            href={`/community/chats/${c.id}`}
            className="block py-4"
          >
            <span className="block text-sm font-semibold">{c.title}</span>
            <span className="mt-1 block text-xs text-zinc-500">
              {people.data?.find((p) => p.id === c.user_id)?.name ?? "Member"} ·{" "}
              {new Date(c.created_at).toLocaleDateString("en-SG", {
                timeZone: "Asia/Singapore",
              })}
            </span>
          </Link>
        ))}
        {!result.data.length && (
          <p className="py-5 text-sm text-zinc-500">No conversations yet.</p>
        )}
      </div>
      <p className="text-xs text-zinc-500">Latest 50 conversations.</p>
    </section>
  );
}
