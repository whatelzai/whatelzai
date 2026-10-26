import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { z } from "zod";
import { ensureUserRow } from "@/lib/users";
import { loadBriefing, briefingLeads } from "@/lib/fcos/server";
import { briefingEvents } from "@/lib/fcos/events";
import { eventHref } from "@/lib/fcos/links";
import {
  loadSharedBriefing,
  shareRecipients,
  noteShares,
} from "@/lib/fcos/sharing";
import { BriefingEditor } from "@/components/fcos/BriefingEditor";
import { NoteSharing } from "@/components/fcos/NoteSharing";
import { MemberNav } from "@/components/culture/MemberNav";
import { dateLabel } from "@/lib/leads/model";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "HQH / HHH note · fcOS",
  robots: { index: false, follow: false },
};
export default async function BriefingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  if (!(await ensureUserRow())) redirect("/sign-in");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const note = await loadBriefing(id);
  if (!note) {
    const shared = await loadSharedBriefing(id);
    if (!shared) notFound();
    return (
      <main className="mx-auto max-w-3xl space-y-6 px-5 py-8">
        <MemberNav current="/briefings" />
        <Link href="/briefings?view=shared" className="text-sm underline">
          ← Team notes
        </Link>
        <header>
          <p className="text-sm text-zinc-500">Team note · Read only</p>
          <h1 className="mt-2 text-3xl font-semibold">{shared.title}</h1>
          <p className="mt-3 text-sm">
            {shared.kind} · {shared.status} · {dateLabel(shared.occurred_on)}
          </p>
          <p className="mt-2 text-zinc-500">{shared.event_name}</p>
        </header>
        {[
          { label: "Background / observations", body: shared.observations },
          { label: "Reflections / approach", body: shared.reflections },
          { label: "Next steps", body: shared.next_steps },
        ].map((part) => (
          <section key={part.label} className="rounded-2xl border p-5">
            <h2 className="font-semibold">{part.label}</h2>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">
              {part.body || "Nothing recorded."}
            </p>
          </section>
        ))}
        <p className="text-sm text-zinc-500">
          Team visibility is read only. Each linked Baobei has its own
          visibility controls.
        </p>
      </main>
    );
  }
  const month = note.event_month ?? note.occurred_on.slice(0, 7);
  const [leads, events, recipients, shares, q] = await Promise.all([
    briefingLeads(),
    briefingEvents(month).catch(() => []),
    shareRecipients(),
    noteShares(id),
    searchParams,
  ]);
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-5 py-8">
      <MemberNav current="/briefings" />
      <Link href="/briefings" className="block text-sm underline">
        ← HQH & HHH
      </Link>
      <h1 className="text-3xl font-semibold">{note.title}</h1>
      {q.saved === "1" && (
        <p role="status" className="text-green-700">
          Note saved
          {note.visibility === "private"
            ? " · hidden from the team."
            : " · team visible, subject to linked Baobei visibility and individual exclusions."}
        </p>
      )}
      <div className="flex flex-wrap gap-3 text-sm">
        {leads
          .filter((lead) => note.lead_ids.includes(lead.id))
          .map((lead) => (
            <Link
              key={lead.id}
              className="rounded-full border px-3 py-2"
              href={`/leads/${lead.id}`}
            >
              {lead.name} →
            </Link>
          ))}
        {note.event_key && note.event_month && (
          <Link
            className="rounded-full border px-3 py-2"
            href={eventHref(note.event_month, note.event_key)}
          >
            Linked event →
          </Link>
        )}
      </div>
      <BriefingEditor
        key={note.revision}
        note={note}
        leads={leads}
        events={events}
        calendarMonth={month}
      />
      <NoteSharing id={id} recipients={recipients} shares={shares} />
    </main>
  );
}
