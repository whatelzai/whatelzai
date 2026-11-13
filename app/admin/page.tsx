import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "@/components/admin/AdminLink";
import { AdminText } from "@/components/admin/AdminPreferences";
import { WeeklyFocus } from "@/components/admin/WeeklyFocus";
import { AdminSectionLoading } from "@/components/admin/AdminSectionLoading";
import { dailyOwner } from "@/lib/daily/server";
import { singaporeDay } from "@/lib/daily/model";
import { currentWeek } from "@/lib/admin-week";
import { weekSources } from "@/lib/admin-week-server";
import { briefStatus } from "@/lib/admin-overview/model";
import { adminUrl } from "@/lib/admin-url";
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
            <AdminText text="Daily rhythm" />
          </h2>
          <Suspense fallback={<RoutinePlaceholder label="Morning brief" />}>
            <Routine source={sources.morning} kind="morning" now={now} />
          </Suspense>
          <Suspense fallback={<RoutinePlaceholder label="Evening debrief" />}>
            <Routine source={sources.evening} kind="evening" now={now} />
          </Suspense>
          <Suspense fallback={<RoutinePlaceholder label="Weekly closeout" />}>
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
function RoutinePlaceholder({ label }: { label: string }) {
  return (
    <div className="routine-row" role="status">
      <span>
        <AdminText text={label} />
        <small>
          <AdminText text="Checking saved entry…" />
        </small>
      </span>
    </div>
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
  return (
    <Link className="routine-row" href={adminUrl(`/admin/today#${kind}`)}>
      <span>
        <AdminText
          text={kind === "morning" ? "Morning brief" : "Evening debrief"}
        />
        <small>
          <AdminText text={briefStatus(value, kind, now)} />
        </small>
      </span>
      <span aria-hidden="true">›</span>
    </Link>
  );
}
async function Weekly({ source }: { source: Sources["weekly"] }) {
  const value = await source;
  return (
    <Link className="routine-row" href={adminUrl("/admin/today/weekly")}>
      <span>
        <AdminText text="Weekly closeout" />
        <small>
          <AdminText
            text={
              value.status === "unavailable"
                ? "Unavailable"
                : value.data
                  ? "Last complete week · saved"
                  : "Last complete week · no saved entry"
            }
          />
        </small>
      </span>
      <span aria-hidden="true">›</span>
    </Link>
  );
}
