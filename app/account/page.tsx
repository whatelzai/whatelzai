import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { hasActiveEntitlement, stitchOrphansToUser } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

interface EntitlementState {
  status: "none" | "active" | "revoked";
}

async function loadEntitlementState(userId: string): Promise<EntitlementState> {
  if (await hasActiveEntitlement(userId, "playbook"))
    return { status: "active" };
  const { data } = await supabaseAdmin
    .from("entitlements")
    .select("id")
    .eq("app_user_id", userId)
    .eq("product_slug", "playbook")
    .not("revoked_at", "is", null)
    .limit(1)
    .maybeSingle();
  return { status: data ? "revoked" : "none" };
}

async function loadArchetype(userId: string): Promise<{
  key: string;
  name: string | null;
  one_line: string | null;
} | null> {
  const { data: attempt } = await supabaseAdmin
    .from("quiz_attempts")
    .select("archetype_key")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const key = attempt?.archetype_key as string | undefined;
  if (!key) return null;
  const { data: arch } = await supabaseAdmin
    .from("quiz_archetypes")
    .select("name, one_line")
    .eq("slug", key)
    .maybeSingle();
  return {
    key,
    name: (arch?.name as string | undefined) ?? null,
    one_line: (arch?.one_line as string | undefined) ?? null,
  };
}

export default async function AccountPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/account");

  const user = await currentUser();
  const email = user?.email ?? null;

  // Defensive stitch on every load — bounded to orphan rows with a matching
  // email (SPR-111's stitchOrphansToUser). Idempotent no-op if nothing to
  // stitch.
  if (email) {
    try {
      await stitchOrphansToUser(userId, email);
    } catch {
      // Never block /account render on a stitch failure.
    }
  }

  const [ent, archetype] = await Promise.all([
    loadEntitlementState(userId),
    loadArchetype(userId),
  ]);

  return (
    <main className="editorial-index mx-auto max-w-2xl px-6 py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Your account
        </h1>
        <p className="mt-2 text-sm text-zinc-500">{email}</p>
      </header>

      <p className="mb-6">
        <Link href="/account/events" className="underline">
          Your event registrations →
        </Link>
      </p>
      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-500">
          Your archetype
        </h2>
        {archetype ? (
          <div className="mt-3">
            <p className="text-xl font-semibold text-zinc-900">
              {archetype.name ?? archetype.key}
            </p>
            {archetype.one_line && (
              <p className="mt-2 text-sm text-zinc-600">{archetype.one_line}</p>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-zinc-600">
            You haven&apos;t taken the quiz yet.{" "}
            <Link href="/quiz/what-kind-of-solopreneur" className="underline">
              Take it now →
            </Link>
          </p>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-500">
          Your Playbook
        </h2>
        {ent.status === "active" && (
          <div className="mt-3">
            <p className="text-sm text-zinc-600">
              You have lifetime access — including every future update.
            </p>
            <Link
              href="/account/playbook"
              className="mt-4 inline-flex items-center rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Start reading →
            </Link>
          </div>
        )}
        {ent.status === "none" && (
          <div className="mt-3">
            <p className="text-sm text-zinc-600">
              Get the Playbook — S$9, one-off.
            </p>
            <Link
              href="/playbook"
              className="mt-4 inline-flex items-center rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
            >
              See the Playbook →
            </Link>
          </div>
        )}
        {ent.status === "revoked" && (
          <div className="mt-3">
            <p className="text-sm text-zinc-600">
              Access was revoked (refund). You can repurchase any time.
            </p>
            <Link
              href="/playbook"
              className="mt-4 inline-flex items-center rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Repurchase →
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
