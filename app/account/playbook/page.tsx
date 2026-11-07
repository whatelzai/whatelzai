import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { hasActiveEntitlement } from "@/lib/entitlements";
import { getReadingOrderForArchetype } from "@/lib/playbook-chapters";
import { ensureSessionId } from "@/lib/wz-session";
import { hasRecentSessionStart, logEvent } from "@/lib/event-log";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your Playbook",
  robots: { index: false, follow: false },
};

async function loadArchetypeSlug(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("quiz_attempts")
    .select("archetype_key")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.archetype_key as string | undefined) ?? null;
}

export default async function AccountPlaybookPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/account/playbook");
  if (!(await hasActiveEntitlement(userId, "playbook"))) {
    redirect("/playbook?from=locked");
  }

  const archetype = await loadArchetypeSlug(userId);
  const chapters = await getReadingOrderForArchetype(archetype);

  const sessionId = await ensureSessionId();
  if (!(await hasRecentSessionStart(sessionId))) {
    await logEvent({
      event_type: "playbook.session_start",
      session_id: sessionId,
      user_id: userId,
      source: "server",
      payload: {
        entry_path: "/account/playbook",
        referrer: null,
        archetype_slug: archetype,
      },
    });
  }

  return (
    <main className="editorial-index mx-auto max-w-2xl px-6 py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Your Playbook
        </h1>
        {archetype ? (
          <p className="mt-2 text-sm text-zinc-500">
            Reading order tuned for{" "}
            <span className="font-medium text-zinc-700">{archetype}</span>.
          </p>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">
            Take the quiz for a reading order tuned to you.{" "}
            <Link href="/quiz/what-kind-of-solopreneur" className="underline">
              Take the quiz →
            </Link>
          </p>
        )}
      </header>

      <Link href="/playbook/read" className="field-button mb-8">
        Open the full reader →
      </Link>
      {chapters.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-600">
          <p>Chapters are being published — check back soon.</p>
          <p className="mt-2">
            You&apos;ll get every new chapter automatically as they land.
          </p>
        </div>
      ) : (
        <ol className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white">
          {chapters.map((c, i) => (
            <li key={c.id}>
              <Link
                href={`/playbook/${c.slug}`}
                className="flex items-baseline justify-between gap-4 px-5 py-4 hover:bg-zinc-50"
              >
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                    Part {c.part} · Chapter {c.ordinal}
                  </p>
                  <p className="mt-1 font-medium text-zinc-900">{c.title}</p>
                </div>
                <span className="font-mono text-xs tabular-nums text-zinc-400">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
