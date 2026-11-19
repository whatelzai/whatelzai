import { BriefDocument } from "@/components/admin/BriefDocument";
import Link from "@/components/admin/AdminLink";
import { dailyOwner } from "@/lib/daily/server";
import { weeklyStatus } from "@/lib/daily/weekly";
import { emdeeConnection, openaiConnection } from "@/lib/daily/connections";
import { readEmdee } from "@/lib/daily/emdee-client";
import { previousWeek } from "@/lib/daily/weekly-model";
import { DAILY_PARENT } from "@/lib/daily/paths";
import { adminUrl } from "@/lib/admin-url";
import { WeeklyForm } from "./WeeklyForm";
import { apiGenerationEnabled } from "@/lib/daily/settings";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const metadata = {
  title: "Weekly reflection — Admin",
  robots: { index: false, follow: false },
};
export default async function WeeklyPage() {
  const owner = await dailyOwner();
  const week = previousWeek();
  const [run, emdee, ai] = await Promise.all([
    weeklyStatus(owner),
    emdeeConnection(owner),
    openaiConnection(owner),
  ]);
  const apiEnabled = apiGenerationEnabled();
  const ready = apiEnabled && emdee?.parentPath === DAILY_PARENT && !!ai;
  let body = "",
    saved = false,
    readError = false;
  if (emdee?.parentPath === DAILY_PARENT) {
    try {
      const doc = await readEmdee(emdee, week.path);
      body = doc?.content?.split(/^## Notes\s*$/m)[1]?.trim() ?? "";
      saved = !!doc;
      if (!doc && run?.status === "completed") readError = true;
    } catch {
      readError = true;
    }
  }
  return (
    <div className="max-w-3xl space-y-6 text-zinc-950">
      <Link href={adminUrl("/admin/today")} className="text-sm underline">
        ← Back to Today
      </Link>
      <header className="rounded-3xl bg-yellow-300 p-7">
        <p className="text-xs uppercase tracking-widest">
          Your weekly practice
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Weekly reflection</h1>
        <p className="mt-3 text-sm">
          {week.id} · {week.start} to {week.end}
        </p>
      </header>
      <details className="border-b border-zinc-200 py-3">
        <summary className="min-h-11 cursor-pointer py-2 text-sm">
          Schedule & source
        </summary>{" "}
        <p className="text-sm leading-6">
          {apiEnabled ? (
            <>
              Every Monday at 8am Singapore time, the previous Monday–Sunday
              entries are condensed into one weekly reflection under Personal →
              Daily → Weeks. Daily originals stay in Morning and Evening.
            </>
          ) : (
            <>
              ChatGPT prepares your weekly reflection every Monday at 3am
              Singapore time, covering the previous Monday–Sunday. Daily
              originals stay in Morning and Evening. Open or refresh this page
              after a run to read the saved EMDEE summary. API generation is
              off.
            </>
          )}
        </p>
      </details>
      <p role="status" className="text-sm">
        Last week:{" "}
        {saved
          ? "saved in EMDEE"
          : apiEnabled
            ? (run?.status ?? "not prepared yet")
            : "not prepared yet"}
        {apiEnabled && run ? ` · ${run.attempts}/3 API attempts` : ""}
        {apiEnabled && run?.source_count != null
          ? ` · ${run.source_count}/14 entries`
          : ""}
        .
      </p>
      {apiEnabled && run?.status === "failed" && !saved ? (
        <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm">
          The run needs attention at {run.error_code}. Your original entries are
          safe. Check Connections before retrying.
        </p>
      ) : null}
      {apiEnabled && !ready ? (
        <p className="text-sm">
          Connect EMDEE to Personal Daily and OpenAI in{" "}
          <Link
            className="underline"
            href={adminUrl("/admin/today/connections")}
          >
            Connections
          </Link>{" "}
          to enable weekly preparation.
        </p>
      ) : null}
      {apiEnabled ? (
        <WeeklyForm
          disabled={
            !ready ||
            run?.status === "completed" ||
            run?.status === "empty" ||
            (run?.attempts ?? 0) >= 3
          }
        />
      ) : null}
      {readError ? (
        <p role="alert">
          The saved summary could not be read. Check EMDEE before retrying.
        </p>
      ) : null}
      {body ? (
        <article className="min-w-0 rounded-2xl border border-zinc-200 p-6">
          <BriefDocument body={body} />
        </article>
      ) : null}
      <p className="text-xs text-zinc-500">
        Expired authorization or unavailable sources stop the run. Renew EMDEE
        access in Connections when needed. Your personal ChatGPT tasks run at
        4:30am and 9pm Singapore time. API preparation remains off unless
        explicitly enabled.
      </p>
    </div>
  );
}
