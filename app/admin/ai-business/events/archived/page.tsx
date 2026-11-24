import { loadEventPortfolio } from "@/lib/event-portfolio/server";
import { EventRows } from "@/components/admin/event-admin/PortfolioViews";
import Link from "@/components/admin/AdminLink";
import { adminUrl } from "@/lib/admin-url";

export const dynamic = "force-dynamic";
export const metadata = { title: "Archived events — Admin" };

export default async function ArchivedEventsPage() {
  const archived = (await loadEventPortfolio()).filter(
    (event) => event.metadata.status === "archived",
  );
  return (
    <div className="admin-ledger portfolio-events">
      <header className="ledger-title">
        <h1>Archived events</h1>
        <Link href={adminUrl("/admin/ai-business/events")}>All events</Link>
      </header>
      {archived.length ? (
        <EventRows events={archived} />
      ) : (
        <p>No archived events.</p>
      )}
    </div>
  );
}
