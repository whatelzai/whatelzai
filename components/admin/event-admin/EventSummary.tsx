import { CalendarDays, ChevronRight } from "lucide-react";
import Link from "@/components/admin/AdminLink";
import { adminUrl } from "@/lib/admin-url";
import { loadEventPortfolio } from "@/lib/event-portfolio/server";
import { nextPortfolioEvent } from "@/lib/event-portfolio";
import { singaporeDay } from "@/lib/daily/model";
export default async function EventSummary() {
  let events;
  try {
    events = await loadEventPortfolio();
  } catch {
    return (
      <Link
        className="event-pulse"
        href={adminUrl("/admin/ai-business/events")}
      >
        <CalendarDays size={24} />
        <span>
          <strong>Events unavailable</strong>
          <small>Open events to retry</small>
        </span>
        <ChevronRight size={18} />
      </Link>
    );
  }
  const next = nextPortfolioEvent(events, singaporeDay());
  return (
    <Link
      className="event-pulse"
      href={adminUrl("/admin/ai-business/events" + (next ? "/" + next.id : ""))}
    >
      <CalendarDays size={24} />
      <span className="event-pulse-title">
        <strong>
          {next
            ? `${new Date(next.date + "T12:00:00+08:00").toLocaleDateString("en-SG", { day: "numeric", month: "short", timeZone: "Asia/Singapore" })} · ${next.name}`
            : "Plan the next event"}
        </strong>
        <small>
          {next
            ? next.metadata.registration_status === "not_activated"
              ? "Draft · registration not activated"
              : next.published
                ? "Upcoming event"
                : "Draft event"
            : "No upcoming event recorded"}
        </small>
      </span>
      <ChevronRight size={18} />
    </Link>
  );
}
