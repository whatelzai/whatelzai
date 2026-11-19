import { weosAccess } from "@/lib/weos-role-server";
import { redirect } from "next/navigation";
import { RhythmPanel } from "@/components/admin/RhythmPanel";
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
export const metadata: Metadata = {
  title: "Home — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function OverviewPage() {
  if ((await weosAccess()).actual === "blaze") redirect("/community");
  const owner = await dailyOwner();
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
        <aside className="rhythm-section">
          <h2>
            <AdminText text="Rhythm" />
          </h2>
          <Suspense fallback={<div className="min-h-28" aria-busy="true" />}>
            <RhythmPanel owner={owner} />
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
