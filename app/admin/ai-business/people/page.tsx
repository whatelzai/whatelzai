import { Suspense } from "react";
import { loadInviteList } from "@/lib/ai-invites/server";
import { PeopleOverview } from "@/components/admin/event-admin/PortfolioViews";
import { singaporeDay } from "@/lib/daily/model";
import { eventAdminData } from "@/lib/event-admin/server";
import { mapEvent } from "@/lib/public-events/map";
export const dynamic = "force-dynamic";
export const metadata = { title: "People overview — Admin" };
export default async function Page() {
  let data;
  try {
    data = await loadInviteList();
  } catch {
    return (
      <div className="admin-ledger">
        <h1>People</h1>
        <p role="alert">People statistics unavailable. Refresh to retry.</p>
      </div>
    );
  }
  return (
    <>
      <PeopleOverview contacts={data.contacts} today={singaporeDay()} />
      <Suspense fallback={<p role="status">Reading ticket revenue…</p>}>
        <Revenue />
      </Suspense>
    </>
  );
}
async function Revenue() {
  let d;
  try {
    d = await eventAdminData();
  } catch {
    return (
      <p className="admin-ledger" role="alert">
        Ticket revenue unavailable.
      </p>
    );
  }
  return (
    <section className="admin-ledger portfolio-revenue">
      <h2>Recorded ticket revenue</h2>
      <strong>SGD {(d.counts.recordedPaidMinor / 100).toFixed(2)}</strong>
      <p>
        {new Date(mapEvent.startsAt).toLocaleDateString("en-SG", {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "Asia/Singapore",
        })}{" "}
        only · before fees and event costs
      </p>
    </section>
  );
}
