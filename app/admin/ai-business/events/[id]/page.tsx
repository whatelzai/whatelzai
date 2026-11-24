import EventOperations from "@/components/admin/event-admin/EventOperations";
import { adminOccurrence } from "@/lib/event-admin/occurrence";

import { notFound } from "next/navigation";
import { loadEventPortfolio } from "@/lib/event-portfolio/server";
import { loadInviteList } from "@/lib/ai-invites/server";
import { EventDetail } from "@/components/admin/event-admin/PortfolioViews";
export const dynamic = "force-dynamic";
export const metadata = { title: "Event — Admin" };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let events;
  try {
    events = await loadEventPortfolio();
  } catch {
    return (
      <div className="admin-ledger">
        <h1>Event unavailable</h1>
        <p role="alert">Refresh to retry.</p>
      </div>
    );
  }
  const event = events.find((e) => e.id === id);
  if (!event) notFound();
  const contacts = await loadInviteList().then(
    (list) => list.contacts,
    () => null,
  );
  return (
    <>
      <EventOperations event={adminOccurrence(event)} />
      <details className="admin-ledger">
        <summary>Event details and recorded attendance</summary>
        <EventDetail event={event} contacts={contacts} />
      </details>
    </>
  );
}
