import Link from "@/components/admin/AdminLink";
import { notFound } from "next/navigation";
import { BriefMarkdown } from "@/components/admin/BriefMarkdown";
import { adminUrl } from "@/lib/admin-url";
import { loadRoutine } from "@/lib/daily/routines";
import { findRoutine } from "@/lib/daily/routines-model";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Daily routine skill — Admin",
  robots: { index: false, follow: false },
};
export default async function RoutinePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const state = await loadRoutine(slug);
  if (state.status === "not-found") notFound();
  const routine = findRoutine(slug)!;
  return (
    <div className="max-w-3xl space-y-6 text-zinc-950">
      <Link
        href={adminUrl("/admin/today/routines")}
        className="text-sm underline"
      >
        ← Routine library
      </Link>
      <header className="rounded-3xl bg-yellow-300 p-7">
        <p className="text-xs uppercase tracking-widest">
          {routine.schedule} · Singapore
        </p>
        <h1 className="mt-3 text-3xl font-semibold">{routine.title}</h1>
        <p className="mt-3 text-sm leading-6">{routine.summary}</p>
      </header>
      {state.status === "ready" ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-zinc-500">
              v{state.version} · Private EMDEE source
            </span>
            <a
              href={adminUrl(`/admin/today/routines/${slug}/download`)}
              className="rounded-full bg-zinc-950 px-5 py-3 font-medium text-white"
            >
              Download SKILL.md ↓
            </a>
          </div>
          <article className="min-w-0 rounded-2xl border border-zinc-200 p-5 sm:p-7">
            <BriefMarkdown body={state.content} />
          </article>
          <details className="rounded-xl border border-zinc-200 p-4">
            <summary className="cursor-pointer text-sm font-medium">
              Reuse in a chat or schedule
            </summary>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              For local Codex use, save the download as {slug}/SKILL.md in your
              skills folder, then invoke ${slug}. For a connected ChatGPT chat,
              use this instruction:
            </p>
            <pre className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-zinc-50 p-4 text-xs leading-6">
              Read the Notes section of {state.path} using EMDEE MCP, then
              follow that skill for this run. Preserve its source, destination
              and readback rules.
            </pre>
            <p className="mt-3 text-xs leading-6 text-zinc-500">
              A skill defines the routine; the schedule defines when it runs.
              Existing task prompts are unchanged. Local downloads are
              snapshots; download again after editing the canonical skill in
              EMDEE.
            </p>
            <p className="mt-3 break-all font-mono text-xs text-zinc-400">
              SHA-256 · {state.checksum}
            </p>
          </details>
        </>
      ) : (
        <p
          role="status"
          className="rounded-xl border border-zinc-200 p-5 text-sm leading-6"
        >
          {state.status === "disconnected"
            ? "Connect EMDEE to Personal Daily to read this skill."
            : state.status === "missing"
              ? "This skill has not been saved in EMDEE yet."
              : "The saved skill could not be read or validated. Refresh or check your EMDEE connection; no fallback instructions are being substituted."}{" "}
          <Link
            className="underline"
            href={adminUrl("/admin/today/connections")}
          >
            Connections →
          </Link>
        </p>
      )}
    </div>
  );
}
