import Image from "next/image";
import Link from "next/link";
import {
  loadPublicEvents,
  publicEventNow,
} from "@/lib/public-events/catalog-server";
import { feedbackNext } from "@/lib/event-feedback/model";
import { priceLabel } from "@/lib/public-events/catalog";
export default async function FeedbackNextEvents() {
  const event = feedbackNext(await loadPublicEvents(), publicEventNow());
  return (
    <section className="feedback-next" aria-labelledby="feedback-next-title">
      <h2 id="feedback-next-title">Keep the conversation going.</h2>
      <div className="feedback-next-grid">
        {event ? (
          <Link href={event.path} className="feedback-next-card">
            {event.poster && (
              <Image
                src={event.poster}
                width={event.posterWidth}
                height={event.posterHeight}
                alt={`${event.title} poster`}
                sizes="(max-width:760px) 100px, 140px"
              />
            )}
            <div>
              <p>Next weekly session</p>
              <h3>{event.title}</h3>
              <p>
                {event.dateLabel}
                <br />
                {event.venue}
                {event.priceMinor !== null
                  ? ` · ${priceLabel(event.priceMinor)}`
                  : ""}
              </p>
              <span>View session ↗</span>
            </div>
          </Link>
        ) : (
          <Link href="/events" className="feedback-next-card">
            <div>
              <h3>The next weekly session</h3>
              <p>New dates will appear here when they’re ready.</p>
              <span>Explore events ↗</span>
            </div>
          </Link>
        )}
        <article className="feedback-next-card feedback-intensive">
          <div>
            <p>A bigger gathering</p>
            <h3>AI Money Intensive</h3>
            <p>
              We’re planning the next intensive. Date and details coming soon.
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}
