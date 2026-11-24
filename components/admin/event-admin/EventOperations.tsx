import type { AdminOccurrence } from "@/lib/event-admin/occurrence";
import AttendeeList from "./AttendeeList";
import EventFeedbackReview from "@/components/events/EventFeedbackReview";
import { loadEventPortfolio } from "@/lib/event-portfolio/server";

export default async function EventOperations({
  event,
}: {
  event: AdminOccurrence;
}) {
  const rows = await loadEventPortfolio();
  const source = rows.find(
    (row) =>
      row.id === event.id ||
      row.metadata.event_id === event.id ||
      row.key === event.key,
  );
  return (
    <div className="event-admin">
      <AttendeeList
        key={event.id}
        event={event}
        feedback={
          source ? (
            <EventFeedbackReview
              recordId={source.id}
              eventId={event.id}
              published={source.published}
            />
          ) : (
            <p role="alert">Feedback unavailable. Refresh to retry.</p>
          )
        }
      />
    </div>
  );
}
