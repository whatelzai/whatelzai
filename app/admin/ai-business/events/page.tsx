import { loadEventPortfolio } from "@/lib/event-portfolio/server";
import {
  nextPortfolioEvent,
  isUpcomingEvent,
  isPastEvent,
} from "@/lib/event-portfolio";
import { singaporeDay } from "@/lib/daily/model";
import { EventRows } from "@/components/admin/event-admin/PortfolioViews";
import Link from "@/components/admin/AdminLink";
import { adminUrl } from "@/lib/admin-url";
export const dynamic = "force-dynamic";
export const metadata = { title: "All events — Admin" };
export default async function Page() {
  let events;
  try {
    events = await loadEventPortfolio();
  } catch {
    return (
      <div className="admin-ledger">
        <h1>Events</h1>
        <p role="alert">Events unavailable. Refresh to retry.</p>
      </div>
    );
  }
  const today = singaporeDay();
  // Server-only request snapshot: every classification uses the same instant.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const next = nextPortfolioEvent(events, today, now);
  const upcoming = events.filter((e) => isUpcomingEvent(e, today, now));
  const past = events.filter((e) => isPastEvent(e, today, now));
  const undated = events.filter(
    (e) => !upcoming.includes(e) && !past.includes(e),
  );
  return (
    <div className="admin-ledger portfolio-events">
      <header className="ledger-title">
        <h1>Events</h1>
        <Link href={adminUrl("/admin/ai-business/people")}>
          People overview
        </Link>
      </header>
      {next && (
        <section>
          <h2>Next event</h2>
          <EventRows events={[next]} />
        </section>
      )}
      {upcoming.filter((e) => e.id !== next?.id).length > 0 && (
        <section>
          <h2>Upcoming</h2>
          <EventRows events={upcoming.filter((e) => e.id !== next?.id)} />
        </section>
      )}
      <section>
        <h2 id="past-events">Past events</h2>
        {past.length ? (
          <EventRows events={past} />
        ) : (
          <p>No past events recorded.</p>
        )}
      </section>
      {undated.length > 0 && (
        <section>
          <h2>Other records</h2>
          <EventRows events={undated} />
        </section>
      )}
      <details className="workspace-secondary">
        <summary>Event administration</summary>
        <Link href={adminUrl("/admin/events")}>
          Manage event records & testimonial attribution
        </Link>
      </details>
    </div>
  );
}
