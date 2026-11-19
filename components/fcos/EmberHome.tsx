import { getMemberLanguagePreference } from "@/lib/fcos/language-server";
import { LanguageWelcome } from "./LanguageWelcome";
import Link from "@/components/fcos/MemberLink";
import { AppHeader } from "@/components/fcos/AppHeader";
import { MemberNav } from "@/components/culture/MemberNav";
export async function EmberHome() {
  const preference = await getMemberLanguagePreference();
  return (
    <main className="fcos-tab-page mx-auto max-w-3xl space-y-5 px-5 py-6">
      <AppHeader title="Home" />
      {preference.needsChoice && <LanguageWelcome />}
      <MemberNav current="/" compact persistent />
      <section className="rounded-3xl bg-white p-6">
        <p className="text-sm text-zinc-500">weOS · Ember</p>
        <h1 className="mt-2 text-2xl font-semibold">
          Keep learning. Put AI into practice.
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Ask a question, work through an idea or explore what’s coming up.
        </p>
        <Link
          href="/assistant"
          className="mt-5 inline-flex min-h-12 items-center rounded-full bg-yellow-300 px-5 text-sm font-semibold"
        >
          Open Chat
        </Link>
      </section>
      <section className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white px-5">
        <Link
          href="/calendar"
          className="flex min-h-16 items-center justify-between text-sm"
        >
          Events <span aria-hidden>→</span>
        </Link>
        <Link
          href="/resources"
          className="flex min-h-16 items-center justify-between text-sm"
        >
          AI learning resources <span aria-hidden>→</span>
        </Link>
      </section>
    </main>
  );
}
