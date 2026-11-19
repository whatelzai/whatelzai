import { notFound } from "next/navigation";
import Link from "next/link";
import { dailyOwner } from "@/lib/daily/server";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { z } from "zod";
export const dynamic = "force-dynamic";
export default async function ChatReview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await dailyOwner();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const db = await createAuthClient();
  const conversation = await db
    .from("member_ai_conversations")
    .select("id,user_id,title")
    .eq("id", id)
    .maybeSingle();
  if (conversation.error) throw Error("Conversation unavailable");
  if (!conversation.data) notFound();
  const messages = await db
    .from("member_ai_messages")
    .select("id,role,body,created_at")
    .eq("conversation_id", id)
    .eq("user_id", conversation.data.user_id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (messages.error) throw Error("Messages unavailable");
  return (
    <section className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/community/chats"
        className="inline-flex min-h-11 items-center text-sm"
      >
        ← Chat review
      </Link>
      <h1 className="break-words text-2xl font-semibold">
        {conversation.data.title}
      </h1>
      <p className="text-xs leading-5 text-zinc-500">
        Read-only Beacon review · latest 100 messages · no automatic analysis or
        external sharing.
      </p>
      <div className="space-y-5">
        {messages.data.reverse().map((m) => (
          <article
            key={m.id}
            className="rounded-2xl border border-zinc-200 bg-white p-5"
          >
            <p className="text-xs font-medium text-zinc-500">
              {m.role === "user" ? "Member" : "weOS"}
            </p>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">
              {m.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
