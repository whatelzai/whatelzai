import Image from "next/image";
import Link from "next/link";
import {
  loadPublicEvents,
  publicEventNow,
} from "@/lib/public-events/catalog-server";
import { nextWeeklyEvent, priceLabel } from "@/lib/public-events/catalog";
export default async function NextWeeklyFeature() {
  let event;
  try {
    event = nextWeeklyEvent(await loadPublicEvents(), publicEventNow());
  } catch {
    return (
      <section className="field-wrap events-book-note">
        <h2>Learn with Edmund.</h2>
        <Link className="field-button" href="/events">
          Explore events ↗
        </Link>
      </section>
    );
  }
  return (
    <section className="map-feature" aria-labelledby="map-heading">
      <div className="field-wrap map-feature-grid">
        {event?.poster && (
          <Image
            className="map-poster-photo"
            src={event.poster}
            alt={`${event.title} — ${event.dateLabel}`}
            width={event.posterWidth}
            height={event.posterHeight}
            sizes="(max-width:700px) 100vw, 50vw"
          />
        )}
        <div className="offer-copy">
          <p className="offer-label">Weekly sessions with Edmund</p>
          <h2 id="map-heading">
            {event?.title || "Keep learning. Put it to work."}
          </h2>
          <p>
            {event?.description ||
              "Practical AI learning and money mindset, one conversation at a time."}
          </p>
          {event && (
            <p className="offer-event-facts">
              {event.dateLabel}
              {event.timeLabel && (
                <>
                  <br />
                  {event.timeLabel}
                </>
              )}
              <br />
              {event.venue}
              {event.address && (
                <>
                  <br />
                  {event.address}
                </>
              )}
            </p>
          )}
          {event?.priceMinor !== null && event?.priceMinor !== undefined && (
            <p className="map-price">
              <strong>{priceLabel(event.priceMinor)}</strong>
              <span>per person · final price</span>
            </p>
          )}
          <Link className="field-button" href="/events/next">
            {event ? "See the next session" : "Explore events"} ↗
          </Link>
        </div>
      </div>
    </section>
  );
}
