import { AppHeader } from "./AppHeader";
import { MemberNav } from "@/components/culture/MemberNav";
import Link from "next/link";
export function EmberResources() {
  return (
    <main className="fcos-tab-page mx-auto max-w-3xl space-y-5 px-5 py-6">
      <AppHeader title="Resources" />
      <MemberNav current="/resources" compact persistent />
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h1 className="text-xl font-semibold">Learn with AI</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Your space for practical AI learning. A dedicated member lesson
          library is being prepared.
        </p>
        <Link
          href="/assistant"
          className="mt-5 inline-flex min-h-11 items-center rounded-full bg-yellow-300 px-4 text-sm font-medium"
        >
          Ask Chat
        </Link>
      </section>
      <Link
        href="/calendar"
        className="flex min-h-16 items-center justify-between rounded-2xl border border-zinc-200 bg-white px-5 text-sm"
      >
        Explore events <span aria-hidden>→</span>
      </Link>
    </main>
  );
}
