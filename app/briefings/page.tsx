import Link from "next/link";
import { redirect } from "next/navigation";
import { ensureUserRow } from "@/lib/users";
import { sharedBriefings } from "@/lib/fcos/sharing";
import { loadBriefings } from "@/lib/fcos/server";
import { MemberNav } from "@/components/culture/MemberNav";
import { dateLabel } from "@/lib/leads/model";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "HQH & HHH · fcOS",
  robots: { index: false, follow: false },
};
export default async function BriefingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; view?: string }>;
}) {
  if (!(await ensureUserRow())) redirect("/sign-in");
  const q = await searchParams;
  const page = /^[1-9]\d{0,3}$/.test(q.page ?? "") ? Number(q.page) : 1;
  const shared = q.view === "shared";
  const notes = shared
    ? await sharedBriefings(page)
    : await loadBriefings(page);
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-5 py-8">
      <MemberNav current="/briefings" />
      <header>
        <p className="text-xs uppercase tracking-widest text-zinc-500">
          fcOS · Resources · Notebook
        </p>
        <h1 className="mt-2 text-3xl font-semibold">HQH & HHH</h1>
        <p className="mt-3 text-zinc-600">
          Prepare for the people you bring. Reflect on the experiences you
          share.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/briefings/new?kind=HQH"
          className="rounded-2xl bg-yellow-100 p-5"
        >
          <strong>HQH · 会前会</strong>
          <p className="mt-2 text-sm">Prepare a pre-briefing →</p>
        </Link>
        <Link
          href="/briefings/new?kind=HHH"
          className="rounded-2xl bg-zinc-100 p-5"
        >
          <strong>HHH · 会后会</strong>
          <p className="mt-2 text-sm">Record a debrief or class learning →</p>
        </Link>
      </div>
      <Link
        href="/assistant?prompt=hqh"
        className="inline-block text-sm underline"
      >
        Think it through with chat →
      </Link>
      <nav aria-label="Note collection" className="flex gap-3 text-sm">
        <Link
          href="/briefings"
          aria-current={!shared ? "page" : undefined}
          className={`rounded-full border px-4 py-3 ${!shared ? "bg-yellow-100" : ""}`}
        >
          My notes
        </Link>
        <Link
          href="/briefings?view=shared"
          aria-current={shared ? "page" : undefined}
          className={`rounded-full border px-4 py-3 ${shared ? "bg-yellow-100" : ""}`}
        >
          Team notes
        </Link>
      </nav>
      <div className="space-y-3">
        {notes.items.map((note) => (
          <Link
            key={note.id}
            href={`/briefings/${note.id}`}
            className="block rounded-xl border p-4"
          >
            <p className="text-xs text-zinc-500">
              {note.kind} · {note.status} · {dateLabel(note.occurred_on)}
            </p>
            <h2 className="mt-2 font-semibold">{note.title}</h2>
            <p className="text-sm text-zinc-500">{note.event_name}</p>
          </Link>
        ))}
      </div>
      {!notes.count && (
        <p className="rounded-xl border border-dashed p-6 text-zinc-500">
          {shared
            ? "No team notes are available yet."
            : "Your first note starts here. Write it yourself or bring a draft from Chat."}
        </p>
      )}
      <nav className="flex gap-5" aria-label="Note pages">
        {page > 1 && (
          <Link
            href={`/briefings?page=${page - 1}${shared ? "&view=shared" : ""}`}
          >
            ← Previous
          </Link>
        )}
        {page * 30 < notes.count && (
          <Link
            href={`/briefings?page=${page + 1}${shared ? "&view=shared" : ""}`}
          >
            Next →
          </Link>
        )}
      </nav>
    </main>
  );
}
