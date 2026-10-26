import Link from "@/components/fcos/MemberLink";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ChevronRight,
  ClipboardPen,
  Library,
  NotebookPen,
  Package,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { AppHeader } from "@/components/fcos/AppHeader";
import { MemberNav } from "@/components/culture/MemberNav";
import { ensureUserRow } from "@/lib/users";
import { isOwnerUser } from "@/lib/admin-policy";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Resources · fcOS",
  robots: { index: false, follow: false },
};

function ResourceRow({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-20 items-center gap-3 rounded-2xl px-3 py-4 transition-colors hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 active:bg-zinc-100"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-600">
        <Icon aria-hidden="true" size={21} strokeWidth={1.7} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-zinc-900">
          {title}
        </span>
        <span className="mt-0.5 block text-sm leading-5 text-zinc-500">
          {description}
        </span>
      </span>
      <ChevronRight
        aria-hidden="true"
        size={18}
        className="shrink-0 text-zinc-400"
      />
    </Link>
  );
}

export default async function Resources() {
  const user = await ensureUserRow();
  if (!user) redirect("/sign-in");
  return (
    <main className="fcos-tab-page mx-auto max-w-5xl space-y-8 px-5 py-8">
      <AppHeader title="Resources" />
      <MemberNav current="/resources" compact persistent />
      <section aria-labelledby="notes-heading">
        <h2
          id="notes-heading"
          className="mb-3 text-sm font-medium text-zinc-500"
        >
          Make a note
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              kind: "HQH",
              label: "Prepare",
              chinese: "会前会",
              icon: ClipboardPen,
              color: "bg-yellow-50 hover:bg-yellow-100",
            },
            {
              kind: "HHH",
              label: "Reflect",
              chinese: "会后会",
              icon: NotebookPen,
              color: "bg-violet-50 hover:bg-violet-100",
            },
          ].map(({ kind, label, chinese, icon: Icon, color }) => (
            <Link
              key={kind}
              href={`/briefings/new?kind=${kind}`}
              className={`rounded-3xl p-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 sm:p-5 ${color}`}
            >
              <div className="mb-5 flex items-center justify-between text-zinc-600">
                <Icon aria-hidden="true" size={23} strokeWidth={1.7} />
                <ArrowUpRight
                  aria-hidden="true"
                  size={17}
                  className="text-zinc-400"
                />
              </div>
              <span className="block text-lg font-semibold">{label}</span>
              <span className="mt-1 block text-sm text-zinc-600">
                {kind} · {chinese}
              </span>
            </Link>
          ))}
        </div>
      </section>
      <div className="grid gap-7 md:grid-cols-2 md:gap-x-10">
        <section aria-labelledby="meetings-heading">
          <h2
            id="meetings-heading"
            className="mb-1 px-3 text-sm font-medium text-zinc-500"
          >
            Notes & events
          </h2>
          <ResourceRow
            href="/briefings"
            title="Notebook"
            description="Saved HQH, HHH & shared notes"
            icon={Library}
          />
          <ResourceRow
            href="/calendar"
            title="Calendar"
            description="What’s happening next"
            icon={CalendarDays}
          />
        </section>
        <section aria-labelledby="learning-heading">
          <h2
            id="learning-heading"
            className="mb-1 px-3 text-sm font-medium text-zinc-500"
          >
            Learn & grow
          </h2>
          <ResourceRow
            href="/catalogue"
            title="Products"
            description="MY & SG · prices, PV & BV"
            icon={Package}
          />
          <ResourceRow
            href="/culture"
            title="Culture"
            description="Team teachings & wise words"
            icon={BookOpen}
          />
          <ResourceRow
            href="/team"
            title="My team"
            description="Uplines, downlines & connections"
            icon={UsersRound}
          />
        </section>
      </div>
      {isOwnerUser(user) && (
        <details className="group border-t border-zinc-100 pt-4">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between rounded-xl px-3 text-sm text-zinc-500 [&::-webkit-details-marker]:hidden">
            Personal tools
            <ChevronRight
              aria-hidden="true"
              size={16}
              className="transition-transform group-open:rotate-90"
            />
          </summary>
          <div className="flex flex-col gap-1 px-3 pb-2 text-sm">
            <Link
              href="/assistant/commitments"
              className="flex min-h-12 items-center text-zinc-700 hover:underline"
            >
              Commitments
            </Link>
            <Link
              href="/assistant/connections"
              className="flex min-h-12 items-center text-zinc-700 hover:underline"
            >
              Knowledge connection
            </Link>
          </div>
        </details>
      )}
    </main>
  );
}
