import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ensureUserRow } from "@/lib/users";
import { loadCulture } from "@/lib/knowledge/server";
import { CultureLibrary } from "@/components/culture/CultureLibrary";
import { MemberNav } from "@/components/culture/MemberNav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Culture",
  robots: { index: false, follow: false },
};

export default async function CulturePage() {
  if (!(await ensureUserRow())) redirect("/sign-in?redirect_url=/culture");
  const libraries = await loadCulture();
  return (
    <main className="mx-auto max-w-5xl space-y-8 px-5 py-10 sm:px-8">
      <MemberNav current="/culture" />
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          Network Marketing · Learning together
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Culture</h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-zinc-600">
          Words to revisit. Ideas to practise. Explore the teachings and values
          of each community, one chapter at a time.
        </p>
      </header>
      <CultureLibrary libraries={libraries} />
    </main>
  );
}
