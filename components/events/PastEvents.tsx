import {
  loadPublicEvents,
  publicEventNow,
} from "@/lib/public-events/catalog-server";
import { pastEvents } from "@/lib/public-events/catalog";
import CatalogCards from "./CatalogCards";
export default async function PastEvents({
  excludeRecordId,
}: {
  excludeRecordId?: string;
}) {
  const events = pastEvents(await loadPublicEvents(), publicEventNow()).filter(
    (e) => e.recordId !== excludeRecordId,
  );
  if (!events.length) return null;
  return (
    <section
      className="event-history"
      id="previous-sessions"
      aria-labelledby="past-events-heading"
    >
      <header>
        <h2 id="past-events-heading">Previous sessions</h2>
        <p>Conversations we’ve shared. Ideas we keep building on.</p>
      </header>
      <CatalogCards events={events} past />
    </section>
  );
}
