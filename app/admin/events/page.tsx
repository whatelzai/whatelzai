import { dailyOwner } from "@/lib/daily/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { adminUrl } from "@/lib/admin-url";
import type { Metadata } from "next";
import Link from "@/components/admin/AdminLink";
import {
  listServiceEvents,
  SERVICE_EVENT_KIND_LABELS,
} from "@/lib/service-events";

export const metadata: Metadata = {
  title: "Events — whatelz.ai Admin",
};

export const dynamic = "force-dynamic";

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminEventsPage() {
  await dailyOwner();
  const [events, drafts] = await Promise.all([
    listServiceEvents(),
    supabaseAdmin
      .from("events")
      .select("id,name,date,location,notes")
      .eq("published", false)
      .contains("metadata", { planning: true })
      .order("date")
      .limit(25),
  ]);

  return (
    <div className="space-y-6">
      <Link href={adminUrl("/admin/event-checkin")} className="underline">
        Seminar registrations &amp; check-in →
      </Link>
      <nav className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
        <Link
          href={adminUrl("/admin/testimonials")}
          className="hover:text-zinc-900"
        >
          ← Testimonials
        </Link>
      </nav>
      <div className="flex items-start justify-between border-b border-zinc-200 pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
            Testimonials · Attribution
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
            Events
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Past trainings, workshops, and other sessions. Testimonials can be
            linked to a specific event.
          </p>
        </div>
        <Link
          href={adminUrl("/admin/events/new")}
          className="inline-flex items-center gap-1.5 border border-zinc-900 bg-zinc-900 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-white transition-colors hover:bg-[var(--accent)] hover:text-zinc-900 hover:border-[var(--accent)]"
        >
          + New event
        </Link>
      </div>

      <section
        id="draft-events"
        aria-label="Draft events"
        className="space-y-3"
      >
        <h2 className="text-lg font-semibold">Draft events</h2>
        {drafts.error ? (
          <p role="alert">Drafts unavailable. Refresh to retry.</p>
        ) : !drafts.data?.length ? (
          <p className="text-sm">No draft events.</p>
        ) : (
          drafts.data.map((d) => (
            <article key={d.id} className="border-b border-zinc-200 py-3">
              <p className="text-xs">Draft · {formatDate(d.date)}</p>
              <h3 className="font-semibold">{d.name}</h3>
              <p className="text-sm">
                {d.location || "Venue to confirm"} · Time to confirm
              </p>
            </article>
          ))
        )}
      </section>

      {events.length === 0 ? (
        <div className="rounded border border-dashed border-zinc-200 px-6 py-12 text-center">
          <p className="text-sm text-zinc-500">No events yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 rounded border border-zinc-200">
          {events.map((e) => (
            <Link
              key={e.id}
              href={adminUrl(`/admin/events/${e.id}`)}
              className="block px-4 py-4 transition-colors hover:bg-zinc-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-900">
                      {e.name}
                    </p>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                      {SERVICE_EVENT_KIND_LABELS[e.kind]}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-zinc-400">
                    {formatDate(e.event_date)}
                    {e.location ? ` · ${e.location}` : ""}
                    {e.attendee_count ? ` · ${e.attendee_count} pax` : ""}
                    {" · "}
                    {e.slug}
                  </p>
                  {e.description && (
                    <p className="mt-1 line-clamp-1 text-xs text-zinc-600">
                      {e.description}
                    </p>
                  )}
                </div>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  Edit →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
