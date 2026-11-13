import { notFound } from "next/navigation";
import { loadEventPortfolio } from "@/lib/event-portfolio/server";
import { loadInviteList } from "@/lib/ai-invites/server";
import { eventReference } from "@/lib/event-portfolio";
import { eventAdminData } from "@/lib/event-admin/server";
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
  const [peopleResult, ticketResult] = await Promise.allSettled([
    loadInviteList(),
    event.key || typeof event.metadata.event_key === "string"
      ? eventAdminData(eventReference(event))
      : Promise.resolve(undefined),
  ]);
  const contacts =
    peopleResult.status === "fulfilled" ? peopleResult.value.contacts : null;
  const tickets =
    ticketResult.status === "fulfilled" ? ticketResult.value : null;
  return <EventDetail event={event} contacts={contacts} tickets={tickets} />;
}
