import Link from "next/link";
import { contextBriefings } from "@/lib/fcos/server";
import { dateLabel } from "@/lib/leads/model";
export async function ContextNotes({
  context,
  createQuery,
}: {
  context: { lead: string } | { event: string };
  createQuery: string;
}) {
  const notes = await contextBriefings(context);
  return (
    <section className="fcos-context-notes space-y-4 rounded-2xl border border-zinc-200 p-5">
      <h2 className="text-xl font-semibold">HQH & HHH · Linked notes</h2>
      <p className="text-sm text-zinc-500">
        Team-visible HQH and HHH, including your notes. Hidden notes and hidden
        Baobeis stay restricted.
      </p>
      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          className="rounded-xl bg-yellow-100 px-4 py-3"
          href={`/briefings/new?kind=HQH&${createQuery}`}
        >
          + HQH · Prepare
        </Link>
        <Link
          className="rounded-xl bg-zinc-100 px-4 py-3"
          href={`/briefings/new?kind=HHH&${createQuery}`}
        >
          + HHH · Reflect
        </Link>
      </div>
      {notes.items.map((note) => (
        <Link
          key={note.id}
          href={`/briefings/${note.id}`}
          className="block rounded-xl border p-4"
        >
          <p className="text-xs text-zinc-500">
            {note.kind} · {note.status} · {dateLabel(note.occurred_on)}
          </p>
          <h3 className="mt-1 font-semibold">{note.title}</h3>
        </Link>
      ))}
      {!notes.count && (
        <p className="text-sm text-zinc-500">No linked notes yet.</p>
      )}
      {notes.count > notes.items.length && (
        <p className="text-sm text-zinc-500">
          Showing the latest {notes.items.length} of {notes.count}. Browse all
          notes in{" "}
          <Link href="/briefings" className="underline">
            Resources
          </Link>
          .
        </p>
      )}
    </section>
  );
}
