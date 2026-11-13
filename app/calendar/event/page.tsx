import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ensureUserRow } from "@/lib/users";
import { calendarEvent } from "@/lib/fcos/events";
import { MemberNav } from "@/components/culture/MemberNav";
import { ContextNotes } from "@/components/fcos/ContextNotes";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Event notes · weOS",
  robots: { index: false, follow: false },
};
export default async function EventPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; event?: string }>;
}) {
  if (!(await ensureUserRow())) redirect("/sign-in");
  const q = await searchParams;
  const event = await calendarEvent(q.month ?? "", q.event ?? "");
  if (!event) notFound();
  const query = new URLSearchParams({
    month: q.month!,
    event: event.id,
  }).toString();
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-5 py-8">
      <MemberNav current="/calendar" />
      <Link href={`/calendar?month=${q.month}`} className="text-sm underline">
        ← Calendar
      </Link>
      <header>
        <p className="text-xs uppercase tracking-widest text-zinc-500">
          Prepare · Experience · Reflect
        </p>
        <h1 className="mt-2 text-3xl font-semibold">{event.title}</h1>
        <p className="mt-3 text-zinc-500">
          {new Intl.DateTimeFormat("en-MY", {
            timeZone: "Asia/Singapore",
            dateStyle: "long",
            ...(event.allDay ? {} : { timeStyle: "short" as const }),
          }).format(new Date(event.start))}{" "}
          · MY / SG time
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          {event.location || "Venue not specified"}
        </p>
      </header>
      <ContextNotes context={{ event: event.id }} createQuery={query} />
      <p className="text-sm text-zinc-500">
        Your note belongs to this specific event occurrence. Other attendees
        cannot see it unless you explicitly share it.
      </p>
    </main>
  );
}
