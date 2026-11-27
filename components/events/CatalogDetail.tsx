import Image from "next/image";
import Link from "next/link";
import {
  type CatalogEvent,
  eventEnds,
  priceLabel,
  topicLabel,
} from "@/lib/public-events/catalog";
import PastEvents from "./PastEvents";
import { feedbackPath } from "@/lib/event-feedback/model";
export default function CatalogDetail({
  event: e,
  now,
}: {
  event: CatalogEvent;
  now: number;
}) {
  const past = eventEnds(e) <= now;
  const open =
    !past && e.registrationUrl && (!e.startsAt || Date.parse(e.startsAt) > now);
  return (
    <main className="field-wrap event-detail-v2">
      <Link className="event-back-link" href="/events">
        ← All events
      </Link>
      <div
        className={`event-hero${e.poster ? "" : " event-hero-without-poster"}`}
      >
        <header className="event-hero-intro">
          <h1>{e.title}</h1>
          {e.cancelled && (
            <p role="status">
              <strong>
                This event has been cancelled. Registration is closed.
              </strong>
            </p>
          )}
          <p className="event-intro-mobile-facts">
            {e.dateLabel}
            <br />
            {e.venue}
          </p>
          <p className="event-hero-description">{e.description}</p>
          {!past && open && (
            <div className="event-mobile-action">
              <p>{e.dateLabel}</p>
              <Link className="event-primary-button" href={e.registrationUrl!}>
                Register
                {e.priceMinor !== null
                  ? ` · ${priceLabel(e.priceMinor)}`
                  : ""}{" "}
                ↗
              </Link>
            </div>
          )}
        </header>
        {e.poster && (
          <figure className="event-hero-poster">
            <Image
              src={e.poster}
              alt={`${e.title} — ${e.dateLabel}`}
              width={e.posterWidth}
              height={e.posterHeight}
              sizes="(max-width:760px) 100vw, (max-width:1100px) 44vw, 500px"
              priority
            />
            <figcaption>
              {topicLabel(e.topic)} · {e.dateLabel}
            </figcaption>
          </figure>
        )}
        <section className="event-hero-booking" aria-label="Event details">
          <dl className="event-facts">
            <div>
              <dt>When</dt>
              <dd>
                {e.dateLabel}
                {e.timeLabel && <small>{e.timeLabel}</small>}
              </dd>
            </div>
            <div>
              <dt>Where</dt>
              <dd>
                {e.venueUrl ? (
                  <a
                    href={e.venueUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {e.venue} ↗
                  </a>
                ) : (
                  e.venue || "Venue to be announced"
                )}
                {e.address && <small>{e.address}</small>}
              </dd>
            </div>
            {past && e.attended !== null && e.attended > 0 ? (
              <div>
                <dt>Attended</dt>
                <dd>{e.attended} people</dd>
              </div>
            ) : !e.cancelled && !past && e.capacity !== null ? (
              <div>
                <dt>Places</dt>
                <dd>{e.capacity} maximum</dd>
              </div>
            ) : null}
          </dl>
          {!e.cancelled && (
            <div
              className={`event-book-ticket${past ? " event-book-ticket-past" : ""}`}
            >
              {past ? (
                <div>
                  <strong>This session has ended.</strong>
                  <p>Join us at an upcoming weekly session.</p>
                </div>
              ) : e.priceMinor !== null ? (
                <p className="map-price">
                  {e.originalPriceMinor != null &&
                    e.originalPriceMinor > e.priceMinor! && (
                      <del>{priceLabel(e.originalPriceMinor)}</del>
                    )}
                  <strong>{priceLabel(e.priceMinor)}</strong>
                  <span>per person · final price</span>
                </p>
              ) : (
                <p>Ticket details to be announced.</p>
              )}
              {past ? (
                <Link className="event-primary-button" href="/events/next">
                  See the next session ↗
                </Link>
              ) : open ? (
                <Link
                  className="event-primary-button"
                  href={e.registrationUrl!}
                >
                  Register ↗
                </Link>
              ) : (
                <p>Registration is not open.</p>
              )}
            </div>
          )}
          {open && (
            <p className="event-ticket-note">
              Your QR ticket, delivered to your inbox.
            </p>
          )}
          <p className="event-reference">Event ID: {e.id}</p>
        </section>
      </div>
      {(e.paragraphs.length > 0 || e.agenda.length > 0) && (
        <section
          className="event-writeup"
          aria-labelledby="event-writeup-heading"
        >
          <div className="event-writeup-copy">
            <h2 id="event-writeup-heading">
              {e.heading || "About the session"}
            </h2>
            {e.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          {e.agenda.length > 0 && (
            <div className="event-agenda">
              <h3>Evening schedule</h3>
              <p>{e.dateLabel} · Singapore time</p>
              <dl>
                {e.agenda.map((a) => (
                  <div key={a.time}>
                    <dt>{a.time}</dt>
                    <dd>{a.activity}</dd>
                  </div>
                ))}
              </dl>
              {e.reminder && (
                <p className="event-agenda-reminder">
                  <strong>{e.reminder}</strong>
                </p>
              )}
            </div>
          )}
        </section>
      )}
      {!e.cancelled && past && (
        <p>
          <Link className="text-link" href={feedbackPath(e.id)}>
            Attended this session? Share feedback ↗
          </Link>
        </p>
      )}
      <PastEvents excludeRecordId={e.recordId} />
      <section className="event-book-story">
        <h2>
          Keep learning
          <br />
          between sessions.
        </h2>
        <div>
          <p>
            Explore Edmund’s story, hear from people he’s worked with, or
            continue with The Money &amp; AI Playbook.
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
