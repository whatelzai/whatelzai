import Image from "next/image";
import Link from "next/link";
import {
  type CatalogEvent,
  topicLabel,
  priceLabel,
} from "@/lib/public-events/catalog";
export default function CatalogCards({
  events,
  past = false,
}: {
  events: CatalogEvent[];
  past?: boolean;
}) {
  return (
    <ul className="event-catalog-grid">
      {events.map((e) => (
        <li key={e.recordId}>
          <Link href={e.path} className="event-catalog-card">
            {e.poster ? (
              <div className="event-catalog-art">
                <Image
                  src={e.poster}
                  alt={`Poster for ${e.title}, ${e.dateLabel}`}
                  width={e.posterWidth}
                  height={e.posterHeight}
                  sizes="(max-width: 700px) 100vw, 44vw"
                />
              </div>
            ) : (
              <div className="event-catalog-art event-catalog-art-text">
                <span>{topicLabel(e.topic)}</span>
              </div>
            )}
            <div className="event-catalog-copy">
              <p>
                <time dateTime={e.date}>{e.dateLabel}</time>
              </p>
              <h3>{e.title}</h3>
              <p>
                {e.venue || "Venue to be announced"}
                {past && e.attended !== null && e.attended > 0
                  ? ` · ${e.attended} attended`
                  : !past && e.priceMinor !== null
                    ? ` · ${priceLabel(e.priceMinor)}`
                    : ""}
              </p>
              <span className="text-link">View event ↗</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
