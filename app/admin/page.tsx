import { RhythmShortcut } from "@/components/admin/RhythmShortcut";
import Link from "@/components/admin/AdminLink";
import { adminUrl } from "@/lib/admin-url";
import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminText } from "@/components/admin/AdminPreferences";
import {
  WorkspaceFocus,
  WorkspaceFocusLoading,
} from "@/components/admin/WorkspaceFocus";
import { WorkspaceShortcuts } from "@/components/admin/WorkspaceShortcuts";
import { dailyOwner } from "@/lib/daily/server";
import { singaporeDay } from "@/lib/daily/model";
import { weekSources } from "@/lib/admin-week-server";
import { briefStatus } from "@/lib/admin-overview/model";
export const metadata: Metadata = {
  title: "Home — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function OverviewPage() {
  const owner = await dailyOwner();
  const now = new Date();
  const day = singaporeDay(now);
  const sources = weekSources(owner, day, now);
  return (
    <div className="admin-ledger overview-ledger">
      <h1 className="sr-only">
        <AdminText text="Home" />
      </h1>
      <Suspense fallback={<WorkspaceFocusLoading />}>
        <WorkspaceFocus />
      </Suspense>
      <WorkspaceShortcuts />
      <div className="overview-week-layout">
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
          <Link
            href={adminUrl("/admin/today/routines")}
            className="text-sm underline underline-offset-4"
          >
            <AdminText text="Routine library" />
          </Link>
        </aside>
      </div>
    </div>
  );
}
type Sources = ReturnType<typeof weekSources>;
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
