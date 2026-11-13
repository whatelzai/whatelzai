import { RhythmShortcut } from "@/components/admin/RhythmShortcut";
import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminText } from "@/components/admin/AdminPreferences";
import { WeeklyFocus } from "@/components/admin/WeeklyFocus";
import { AdminSectionLoading } from "@/components/admin/AdminSectionLoading";
import { dailyOwner } from "@/lib/daily/server";
import { singaporeDay } from "@/lib/daily/model";
import { currentWeek } from "@/lib/admin-week";
import { weekSources } from "@/lib/admin-week-server";
import { briefStatus } from "@/lib/admin-overview/model";
export const metadata: Metadata = {
  title: "Overview — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function OverviewPage() {
  const owner = await dailyOwner();
  const now = new Date();
  const day = singaporeDay(now);
  const week = currentWeek(day);
  const sources = weekSources(owner, day, now);
  const date = (d: string) =>
    new Date(d + "T12:00:00Z").toLocaleDateString("en-SG", {
      day: "numeric",
      month: "short",
      timeZone: "Asia/Singapore",
    });
  return (
    <div className="admin-ledger overview-ledger">
      <header className="ledger-title">
        <h1>
          <AdminText text="Overview" />
        </h1>
        <p>
          <AdminText text="This week" /> · {date(week.start)}–{date(week.end)}
        </p>
      </header>
      <div className="overview-week-layout">
        <Suspense
          fallback={
            <AdminSectionLoading label="Reading this week’s commitments…" />
          }
        >
          <Work source={sources.tasks} day={day} />
        </Suspense>
        <aside className="routine-rail">
          <h2>
            <AdminText text="Rhythm" />
          </h2>
          <Suspense
            fallback={
              <RhythmShortcut kind="morning" status="Checking…" loading />
            }
          >
            <Routine source={sources.morning} kind="morning" now={now} />
          </Suspense>
          <Suspense
            fallback={
              <RhythmShortcut kind="evening" status="Checking…" loading />
            }
          >
            <Routine source={sources.evening} kind="evening" now={now} />
          </Suspense>
          <Suspense
            fallback={
              <RhythmShortcut kind="weekly" status="Checking…" loading />
            }
          >
            <Weekly source={sources.weekly} />
          </Suspense>
        </aside>
      </div>
    </div>
  );
}
type Sources = ReturnType<typeof weekSources>;
async function Work({
  source,
  day,
}: {
  source: Sources["tasks"];
  day: string;
}) {
  const result = await source;
  return (
    <WeeklyFocus
      tasks={result.status === "ready" ? result.data.active : null}
      day={day}
    />
  );
}
async function Routine({
  source,
  kind,
  now,
}: {
  source: Sources["morning"];
  kind: "morning" | "evening";
  now: Date;
}) {
  const value = await source;
  return <RhythmShortcut kind={kind} status={briefStatus(value, kind, now)} />;
}
async function Weekly({ source }: { source: Sources["weekly"] }) {
  const value = await source;
  return (
    <RhythmShortcut
      kind="weekly"
      status={
        value.status === "unavailable"
          ? "Unavailable"
          : value.data
            ? "Saved"
            : "No saved entry"
      }
    />
  );
}
