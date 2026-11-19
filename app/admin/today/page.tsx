import { Suspense } from "react";
import { AdminLoading } from "@/components/admin/AdminLoading";
import { BriefMarkdown } from "@/components/admin/BriefMarkdown";
import { BriefDocument } from "@/components/admin/BriefDocument";
import { DailyReading } from "@/components/admin/DailyReading";
import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "@/components/admin/AdminLink";
import { dailyOwner, loadDailyTasks } from "@/lib/daily/server";
import { emdeeConnection } from "@/lib/daily/connections";
import { loadBriefWithConnection } from "@/lib/daily/emdee";
import { DAILY_PARENT } from "@/lib/daily/paths";
import { singaporeDay, previousDay, type Brief } from "@/lib/daily/model";
import { adminUrl } from "@/lib/admin-url";
import { NewTask, TaskRow } from "./Forms";
export const metadata: Metadata = {
  title: "Today — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function TodayPage() {
  const owner = await dailyOwner();
  const day = singaporeDay();
  return (
    <div className="space-y-8 text-zinc-950">
      <header className="admin-page-heading border-b border-zinc-200 pb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Today</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {new Date(day + "T12:00:00+08:00").toLocaleDateString("en-SG", {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: "Asia/Singapore",
          })}
        </p>
      </header>
      <Suspense
        fallback={<AdminLoading title="Reading your daily workspace…" />}
      >
        <DailyWorkspace owner={owner} day={day} />
      </Suspense>
    </div>
  );
}
async function DailyWorkspace({ owner, day }: { owner: string; day: string }) {
  const [tasks, emdee] = await Promise.all([
    loadDailyTasks(day),
    emdeeConnection(owner),
  ]);
  const connected = emdee?.parentPath === DAILY_PARENT;
  let morning: Brief | null = null,
    evening: Brief | null = null,
    yesterday: Brief | null = null;
  let sourceError = "";
  if (connected && emdee) {
    try {
      [morning, evening, yesterday] = await Promise.all([
        loadBriefWithConnection(emdee, day, "morning"),
        loadBriefWithConnection(emdee, day, "evening"),
        loadBriefWithConnection(emdee, previousDay(day), "evening"),
      ]);
    } catch {
      sourceError =
        "EMDEE could not be read. Reconnect or refresh to check your saved entries.";
    }
  }
  const due = tasks.active.filter((t) => t.due_on <= day);
  const upcoming = tasks.active.filter((t) => t.due_on > day);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-zinc-600">
          {due.filter((t) => t.accepted_on).length} accepted ·{" "}
          {tasks.completed.length} completed today
        </p>
        <Link
          href={adminUrl("/admin/today/connections")}
          className="underline underline-offset-4"
        >
          Connections · {connected ? "EMDEE connected" : "Connect EMDEE"}
        </Link>
      </div>
      {!connected ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6">
          Connect EMDEE to Personal → Daily to read your saved briefs here.
        </p>
      ) : null}
      {sourceError ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {sourceError}
        </p>
      ) : null}
      <section id="commitments" className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Accepted work & proposals</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Only accepted work is a commitment.
          </p>
        </div>
        <details className="rounded-xl border border-zinc-200 p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Add a commitment
          </summary>
          <div className="mt-4">
            <NewTask
              key={tasks.active.length + tasks.completed.length}
              day={day}
              id={randomUUID()}
            />
          </div>
        </details>
        <div className="grid gap-3 lg:grid-cols-2">
          {due.map((task) => (
            <TaskRow
              key={`${task.id}-${task.revision}`}
              task={task}
              day={day}
            />
          ))}
        </div>
        {!due.length ? (
          <p className="text-sm text-zinc-500">
            No saved commitments due today.
          </p>
        ) : null}
      </section>
      <DailyReading
        initial={
          evening?.exists &&
          new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Singapore",
            hour: "numeric",
            hourCycle: "h23",
          }).format(new Date()) >= "18"
            ? "evening"
            : "morning"
        }
        morning={
          <div className="space-y-5">
            <h2 className="text-xl font-semibold">Morning brief</h2>
            {sourceError ? (
              <p role="status">This entry could not be read.</p>
            ) : morning?.exists ? (
              <BriefDocument body={morning.body} />
            ) : (
              <p className="text-sm text-zinc-500">
                {connected
                  ? "No saved morning entry yet."
                  : "Connect EMDEE to read your entry."}
              </p>
            )}
          </div>
        }
        evening={
          <div className="space-y-5">
            <h2 className="text-xl font-semibold">Evening closeout</h2>
            {sourceError ? (
              <p role="status">This entry could not be read.</p>
            ) : evening?.exists ? (
              <BriefDocument body={evening.body} />
            ) : (
              <p className="text-sm text-zinc-500">
                {connected
                  ? "No saved evening entry yet."
                  : "Connect EMDEE to read your entry."}
              </p>
            )}
          </div>
        }
      />
      <details className="rounded-2xl border border-zinc-200 p-5">
        <summary className="cursor-pointer text-sm font-medium">
          Yesterday’s handoff
        </summary>
        {yesterday?.exists ? (
          <div className="mt-3">
            <BriefMarkdown body={yesterday.body} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">
            {sourceError
              ? "Unavailable while EMDEE is disconnected."
              : connected
                ? "No evening closeout was found for yesterday. Start with what you know today."
                : "Your previous closeout will appear here once EMDEE is connected."}
          </p>
        )}
      </details>

      {upcoming.length ? (
        <details className="space-y-3">
          <summary className="cursor-pointer text-sm font-medium">
            Coming up
          </summary>
          <div className="grid gap-3 lg:grid-cols-2">
            {upcoming.map((task) => (
              <TaskRow
                key={`${task.id}-${task.revision}`}
                task={task}
                day={day}
              />
            ))}
          </div>
        </details>
      ) : null}
      {tasks.completed.length ? (
        <details className="space-y-3">
          <summary className="cursor-pointer text-sm font-medium">
            Completed today
          </summary>
          <div className="grid gap-3 lg:grid-cols-2">
            {tasks.completed.map((task) => (
              <TaskRow
                key={`${task.id}-${task.revision}`}
                task={task}
                day={day}
              />
            ))}
          </div>
        </details>
      ) : null}
      <details className="border-t border-zinc-200 py-3">
        <summary className="min-h-11 cursor-pointer py-2 text-sm">
          Reading & connections
        </summary>
        <div className="flex flex-wrap gap-5 py-3 text-sm">
          <Link href={adminUrl("/admin/today/weekly")} className="underline">
            Weekly reflection →
          </Link>
          <Link href={adminUrl("/admin/today/routines")} className="underline">
            Routine library →
          </Link>
          <Link
            href={adminUrl("/admin/today/connections")}
            className="underline"
          >
            Connections →
          </Link>
        </div>
        <p className="text-xs text-zinc-500">
          EMDEE · Morning 4:30am · Evening 9pm · Weekly Monday 3am · Singapore.
          Up to 100 unfinished commitments and 100 completions.
        </p>
      </details>
    </>
  );
}
