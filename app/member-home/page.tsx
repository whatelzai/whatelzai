import { getMemberLanguagePreference } from "@/lib/fcos/language-server";
import { LanguageWelcome } from "@/components/fcos/LanguageWelcome";
import { Suspense } from "react";
import { HomeReleaseNotes } from "@/components/releases/HomeReleaseNotes";
import { AppHeader } from "@/components/fcos/AppHeader";
import Link from "@/components/fcos/MemberLink";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  MessageCircle,
  CalendarDays,
  NotebookPen,
  ArrowRight,
  CircleCheck,
} from "lucide-react";
import { ensureUserRow } from "@/lib/users";
import { memberApiEnabled } from "@/lib/member-ai/server";
import { loadAttentionDashboard } from "@/lib/fcos/dashboard";
import { dateLabel, todayUtc8 } from "@/lib/leads/model";
import { MemberNav } from "@/components/culture/MemberNav";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Today · fcOS",
  robots: { index: false, follow: false },
};
const card = "rounded-3xl border border-zinc-200 bg-white p-5 sm:p-6";
const eyebrow =
  "text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500";
export default async function MemberHome() {
  const user = await ensureUserRow();
  if (!user) redirect("/sign-in");
  const [data, preference] = await Promise.all([
    loadAttentionDashboard(),
    getMemberLanguagePreference(),
  ]);
  const canChat = memberApiEnabled();
  const complete = data.leads.available && data.tasks.available;
  const total = complete
    ? (data.leads.count ?? 0) + (data.tasks.count ?? 0)
    : null;
  return (
    <main className="fcos-tab-page mx-auto max-w-5xl space-y-5 px-5 py-6 sm:px-6 sm:py-8">
      <AppHeader title="Home" />
      {preference.needsChoice ? (
        <LanguageWelcome />
      ) : (
        <Suspense fallback={null}>
          <HomeReleaseNotes />
        </Suspense>
      )}
      <MemberNav current="/" compact persistent />
      <header className="flex items-center justify-between gap-3 py-1">
        <div>
          <p className={eyebrow}>Your day, at a glance</p>
          <p className="mt-1 text-sm text-zinc-600">
            <time dateTime={data.today}>{dateLabel(data.today)}</time> · MY / SG
            time
          </p>
        </div>
      </header>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.5fr)]">
        <section className="order-2 rounded-3xl bg-zinc-950 p-6 text-white sm:p-8 lg:sticky lg:top-24 lg:order-1">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">
            Welcome back
          </p>
          <h2 className="mt-3 break-words text-4xl font-semibold tracking-tight sm:text-5xl">
            {user.name?.split(" ")[0] || "Hello"}
            <span className="text-yellow-300">.</span>
          </h2>
          <p className="mt-4 max-w-xs text-sm leading-6 text-zinc-300">
            People to reconnect with.
            <br />A next step worth taking.
          </p>
          <div className="mt-6 border-t border-white/15 pt-5">
            {canChat ? (
              <Link
                href="/assistant"
                className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-yellow-300 px-4 py-3 text-sm font-semibold text-zinc-950"
              >
                <span className="flex items-center gap-2">
                  <MessageCircle size={18} aria-hidden="true" />
                  Think it through with Chat
                </span>
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            ) : (
              <p className="text-sm text-zinc-300">
                AI Chat is temporarily unavailable.
              </p>
            )}
            {canChat && (
              <p className="mt-3 text-xs leading-5 text-zinc-400">
                Your personal AI space · API usage only when you send a message.
              </p>
            )}
          </div>
        </section>
        <section
          className={`${card} order-1 lg:order-2`}
          aria-labelledby="attention-heading"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={eyebrow}>Start here</p>
              <h2
                id="attention-heading"
                className="mt-2 text-2xl font-semibold tracking-tight"
              >
                What needs your attention
              </h2>
            </div>
            {total !== null && (
              <span
                className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold"
                aria-label={`${total} items needing attention`}
              >
                {total}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Due follow-ups and accepted commitments. Pick one next step.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            <Link href="/leads" className="rounded-full border px-3 py-2">
              {data.leads.count ?? "—"} follow-ups
            </Link>
            {canChat && (
              <Link
                href="/assistant/commitments"
                className="rounded-full border px-3 py-2"
              >
                {data.tasks.count ?? "—"} commitments
              </Link>
            )}
          </div>
          {!complete && (
            <p
              role="status"
              className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
            >
              {!data.leads.available ? "Follow-ups could not be loaded. " : ""}
              {!data.tasks.available ? "Commitments could not be loaded. " : ""}
              This list may be incomplete.
            </p>
          )}
          <ul className="mt-3 divide-y divide-zinc-100">
            {data.items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="group flex min-h-20 items-center gap-3 rounded-xl py-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-yellow-500"
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${item.status === "Overdue" || item.status === "Blocked" ? "bg-amber-500" : "bg-zinc-400"}`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-amber-800">
                      {item.status} · {item.kind}
                    </p>
                    <h3 className="mt-1 break-words font-semibold group-hover:underline">
                      {item.title}
                    </h3>
                    <p className="mt-1 break-words text-sm text-zinc-600">
                      {item.detail}
                    </p>
                    {item.date && (
                      <p className="mt-2 text-xs text-zinc-500">
                        {dateLabel(item.date)}
                      </p>
                    )}
                  </div>
                  <ArrowUpRight
                    size={17}
                    className="shrink-0 text-zinc-400"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
          {complete && !data.items.length && (
            <div className="my-5 rounded-2xl bg-zinc-50 p-5">
              <CircleCheck
                className="text-zinc-400"
                size={24}
                aria-hidden="true"
              />
              <h3 className="mt-3 font-semibold">A little breathing room.</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                No due follow-ups or accepted commitments need attention in your
                saved records. Add a next step when you’re ready.
              </p>
            </div>
          )}
          {total !== null && total > data.items.length && (
            <p className="mt-3 text-xs text-zinc-500">
              Showing {data.items.length} of {total}. Open Baobeis or Chat for
              the full lists.
            </p>
          )}
          <p className="mt-3 border-t pt-3 text-xs leading-5 text-zinc-500">
            A past date is a reminder to review, never proof of completion.
          </p>
        </section>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <section className={card} aria-labelledby="events-heading">
          <div className="flex items-center justify-between">
            <p className={eyebrow}>Make room for what’s next</p>
            <CalendarDays
              size={18}
              className="text-zinc-400"
              aria-hidden="true"
            />
          </div>
          <h2 id="events-heading" className="mt-2 text-xl font-semibold">
            Coming up
          </h2>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Activities you can see · this month and next. This schedule is not
            an RSVP.
          </p>
          {!data.calendarAvailable && (
            <p role="status" className="mt-3 text-sm text-amber-900">
              Part of the calendar could not be loaded. The list may be
              incomplete.
            </p>
          )}
          <ul className="mt-4 divide-y divide-zinc-100">
            {data.upcoming.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/calendar?month=${todayUtc8(new Date(event.start)).slice(0, 7)}`}
                  className="block py-3"
                >
                  <h3 className="font-medium hover:underline">{event.title}</h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    {new Intl.DateTimeFormat("en-MY", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Asia/Singapore",
                    }).format(new Date(event.start))}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          {data.calendarAvailable && !data.upcoming.length && (
            <p className="my-5 text-sm text-zinc-500">
              No upcoming activity is visible in the saved schedule for this
              month or next.
            </p>
          )}
          <Link
            href="/calendar"
            className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium"
          >
            Open calendar <ArrowRight size={16} aria-hidden="true" />
          </Link>
          {data.importedAt && (
            <p className="mt-1 text-xs text-zinc-500">
              Schedule imported{" "}
              {dateLabel(todayUtc8(new Date(data.importedAt)))}
            </p>
          )}
        </section>
        <section className={card} aria-labelledby="notes-heading">
          <div className="flex items-center justify-between">
            <p className={eyebrow}>Pick up your thread</p>
            <NotebookPen
              size={18}
              className="text-zinc-400"
              aria-hidden="true"
            />
          </div>
          <h2 id="notes-heading" className="mt-2 text-xl font-semibold">
            Notes to return to
            {data.notes.count !== null && (
              <span className="ml-2 text-sm font-normal text-zinc-500">
                {data.notes.count} drafts
              </span>
            )}
          </h2>
          {!data.notes.available ? (
            <p role="status" className="mt-4 text-sm text-amber-900">
              Your HQH / HHH drafts could not be loaded.
            </p>
          ) : data.notes.items.length ? (
            <ul className="mt-4 divide-y divide-zinc-100">
              {data.notes.items.map((note) => (
                <li key={note.id}>
                  <Link
                    href={`/briefings/${note.id}`}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <span className="min-w-0">
                      <span className="text-xs text-zinc-500">
                        {note.kind} · Draft
                      </span>
                      <span className="mt-1 block break-words font-medium hover:underline">
                        {note.title}
                      </span>
                    </span>
                    <ArrowUpRight
                      size={16}
                      className="shrink-0"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm leading-6 text-zinc-500">
              No unfinished notes. Prepare before you meet, or keep a lesson
              after.
            </p>
          )}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link
              href="/briefings/new?kind=HQH"
              className="rounded-xl bg-yellow-100 p-4 text-sm"
            >
              <span className="block font-semibold">+ HQH · 会前会</span>
              <span className="mt-1 block text-xs text-zinc-600">
                Before the meeting
              </span>
            </Link>
            <Link
              href="/briefings/new?kind=HHH"
              className="rounded-xl bg-zinc-100 p-4 text-sm"
            >
              <span className="block font-semibold">+ HHH · 会后会</span>
              <span className="mt-1 block text-xs text-zinc-600">
                After the experience
              </span>
            </Link>
          </div>
          <Link
            href="/briefings"
            className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium"
          >
            All your notes <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
      </div>
      <footer className="flex flex-wrap gap-5 px-1 py-3 text-sm text-zinc-500">
        <Link href="/resources">Explore resources →</Link>
        <Link href="/team">My team</Link>
        <Link href="/profile">My account</Link>
      </footer>
    </main>
  );
}
