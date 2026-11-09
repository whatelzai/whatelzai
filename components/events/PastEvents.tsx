import Image from "next/image";
import Link from "next/link";
import { pastThursdayEvents } from "@/lib/public-events/past";

export default function PastEvents() {
  return (
    <section className="past-events" aria-labelledby="past-events-heading">
      <p className="offer-label">Thursdays with Edmund</p>
      <h2 id="past-events-heading">Past sessions.</h2>
      <ul>
        {pastThursdayEvents.map((event) => (
          <li key={event.date}>
            <Link href={event.path} className="past-event-link">
              <Image
                src={event.poster}
                alt={`Poster for the ${event.label} session with Edmund`}
                width={1024}
                height={1536}
                sizes="(max-width:700px) 100vw, 33vw"
              />
              <div className="past-event-copy">
                <p className="offer-label">Past event</p>
                <h3>
                  <time dateTime={event.date}>{event.label}</time>
                </h3>
                <p>{event.title}</p>
                <p>
                  {event.venue} · {event.participants} participants
                </p>
                <span className="text-link">View event ↗</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
