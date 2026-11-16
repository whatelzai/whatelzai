import AttendeeList from "./AttendeeList";
import EventFeedbackReview from "@/components/events/EventFeedbackReview";
import { loadEventPortfolio } from "@/lib/event-portfolio/server";
import type { PublicSeminar } from "@/lib/public-events/map";
export default async function EventOperations({
  event,
}: {
  event: PublicSeminar;
}) {
  const rows = await loadEventPortfolio();
  const source = rows.find(
    (row) =>
      row.metadata.event_id === event.id &&
      row.metadata.event_key === event.key,
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
