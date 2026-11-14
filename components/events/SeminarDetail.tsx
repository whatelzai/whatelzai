import { platformRegistrationEnabled } from "@/lib/platform-event-registration";
import EventWriteup from "@/components/events/EventWriteup";
import { EventPrice } from "@/components/events/EventPrice";
import Image from "next/image";
import Link from "next/link";
import PastEvents from "@/components/events/PastEvents";
import { ArrowUpRight } from "lucide-react";
import {
  type PublicSeminar,
  isSeminarOpen,
  registrationPath,
} from "@/lib/public-events/map";
export default function SeminarDetail({
  event: mapEvent,
}: {
  event: PublicSeminar;
}) {
  const open = isSeminarOpen(mapEvent);
  return (
    <main className="field-wrap event-detail-v2">
      <Link href="/events" className="event-back-link">
        ← All events
      </Link>
      <div className="event-hero">
        <header className="event-hero-intro">
          <h1>
            Money Mindset
            <br />× AI Skillset
          </h1>
          <p className="event-hero-description">
            A Thursday evening with Edmund. Practical AI learning, a fresh
            perspective on money, and ideas to put to work.
          </p>
          {open && (
            <div className="event-mobile-action">
              <p>
                {mapEvent.dateLabel} · 7:30 PM · {mapEvent.venue}
              </p>
              <Link
                className="event-primary-button"
                href={
                  platformRegistrationEnabled()
                    ? registrationPath(mapEvent)
                    : mapEvent.checkoutUrl
                }
              >
                Register · {mapEvent.price} <ArrowUpRight size={20} />
              </Link>
            </div>
          )}
        </header>
        <figure className="event-hero-poster">
          <Image
            src={mapEvent.poster}
            alt={`${mapEvent.title} with Edmund, ${mapEvent.dateLabel} at ${mapEvent.venue}.`}
            width={mapEvent.id === "ELZ-EVT-0005" ? 1080 : 1024}
            height={mapEvent.id === "ELZ-EVT-0005" ? 1440 : 1536}
            sizes="(max-width: 760px) 100vw, (max-width: 1100px) 44vw, 500px"
            priority
          />
          <figcaption>Thursdays with Edmund · {mapEvent.id}</figcaption>
        </figure>
        <section
          className="event-hero-booking"
          aria-label="Event details and registration"
        >
          <dl className="event-facts">
            <div>
              <dt>When</dt>
              <dd>
                {mapEvent.dateLabel}
                <small>7:30–9:30 PM · Singapore time</small>
              </dd>
            </div>
            <div>
              <dt>Where</dt>
              <dd>
                <a
                  href={mapEvent.venueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  The Vibe ↗
                </a>
                <small>{mapEvent.address}</small>
              </dd>
            </div>
            <div>
              <dt>Room size</dt>
              <dd>{mapEvent.capacity} participants maximum</dd>
            </div>
          </dl>
          <div className="event-book-ticket">
            <EventPrice event={mapEvent} />
            {open ? (
              <Link
                href={
                  platformRegistrationEnabled()
                    ? registrationPath(mapEvent)
                    : mapEvent.checkoutUrl
                }
                className="event-primary-button"
              >
                Register <ArrowUpRight size={20} />
              </Link>
            ) : (
              <p>Registration closed</p>
            )}
          </div>
          <p className="event-ticket-note">
            Your QR ticket, delivered to your inbox.
          </p>
          <a className="event-schedule-link" href="#event-writeup-heading">
            Explore the evening ↓
          </a>
        </section>
      </div>
      <EventWriteup eventId={mapEvent.id} />
      <PastEvents />
      <section className="event-book-story">
        <h2>
          From the room
          <br />
          to the page.
        </h2>
        <div>
          <p>
            Each Thursday is a place to teach, ask questions and develop ideas.
            Those lessons will feed into{" "}
            <Link href="/playbook">The Money & AI Playbook</Link>.
          </p>
          <div className="event-story-links">
            <Link href="/about">Edmund’s why</Link>
            <Link href="/testimonials">In their words</Link>
            <Link href="/playbook">Explore the book →</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
