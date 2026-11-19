import {
  CalendarDays,
  ChevronRight,
  UsersRound,
  Repeat2,
  Ticket,
} from "lucide-react";
import Link from "@/components/admin/AdminLink";
import { adminUrl } from "@/lib/admin-url";
import {
  eventReference,
  peopleStatistics,
  type PortfolioEvent,
} from "@/lib/event-portfolio";
import type { EventData } from "@/lib/event-admin/model";
import type { InviteContact } from "@/lib/ai-invites/model";
export function eventDate(date: string | null) {
  return date
    ? new Date(date + "T12:00:00+08:00").toLocaleDateString("en-SG", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Singapore",
      })
    : "Date to confirm";
}
export function EventRows({ events }: { events: PortfolioEvent[] }) {
  return (
    <div className="portfolio-event-list">
      {events.map((e) => (
        <Link
          key={e.id}
          href={adminUrl("/admin/ai-business/events/" + e.id)}
          className="portfolio-event-row"
        >
          <CalendarDays size={19} aria-hidden="true" />
          <span>
            <small>{eventDate(e.date)}</small>
            <strong>{e.name}</strong>
            <small>
              {e.location || "Venue to confirm"}
              {e.metadata.venue_status === "provisional"
                ? " · provisional"
                : ""}
            </small>
          </span>
          <ChevronRight size={17} aria-hidden="true" />
        </Link>
      ))}
    </div>
  );
}
export function EventDetail({
  event,
  contacts,
  tickets,
}: {
  event: PortfolioEvent;
  contacts: InviteContact[] | null;
  tickets?: EventData | null;
}) {
  const m = event.metadata;
  const reference = eventReference(event);
  const people = contacts?.filter((c) =>
    c.attendance.some((a) => a.ref === reference),
  );
  return (
    <div className="admin-ledger portfolio-detail">
      <header className="ledger-title">
        <div>
          <p>{eventDate(event.date)}</p>
          <h1>{event.name}</h1>
        </div>
      </header>
      <p>
        {event.location || "Venue to confirm"}
        {m.venue_status === "provisional" ? " · provisional" : ""}
      </p>
      <div className="portfolio-facts">
        {typeof m.starts_at === "string" && typeof m.ends_at === "string" && (
          <span>
            {new Date(m.starts_at).toLocaleTimeString("en-SG", {
              hour: "numeric",
              minute: "2-digit",
              timeZone: "Asia/Singapore",
            })}
            –
            {new Date(m.ends_at).toLocaleTimeString("en-SG", {
              hour: "numeric",
              minute: "2-digit",
              timeZone: "Asia/Singapore",
            })}
          </span>
        )}
        {typeof m.price_minor === "number" &&
          typeof m.currency === "string" && (
            <span>
              {m.currency} {(m.price_minor / 100).toFixed(2)}
            </span>
          )}
        {typeof m.capacity === "number" && <span>{m.capacity} places</span>}
      </div>
      {m.registration_status === "not_activated" && (
        <p className="portfolio-note">Draft · registration not activated</p>
      )}
      {tickets === null && <p role="alert">Registration totals unavailable.</p>}
      {tickets && (
        <section>
          <h2>Event results</h2>
          <div className="portfolio-stat-strip portfolio-event-totals">
            <div>
              <strong>{tickets.counts.confirmed}</strong>
              <span>Confirmed</span>
            </div>
            <div>
              <strong>{tickets.counts.checkedIn}</strong>
              <span>Checked in</span>
            </div>
            <div>
              <strong>
                SGD {(tickets.counts.recordedPaidMinor / 100).toFixed(2)}
              </strong>
              <span>Recorded paid · before fees and costs</span>
            </div>
          </div>
          {tickets.counts.unknown > 0 && (
            <p>
              {tickets.counts.unknown} confirmed tickets have unknown payment
              amounts.
            </p>
          )}
        </section>
      )}
      {event.key && (
        <Link className="focus-primary" href={adminUrl("/admin/event-checkin")}>
          Registrations, check-in & media
        </Link>
      )}
      {!!m.poster_files && typeof m.poster_files === "object" && (
        <section>
          <h2>Posters</h2>
          <div className="portfolio-facts">
            {Object.keys(m.poster_files)
              .filter((k) => ["post", "story", "original"].includes(k))
              .map((k) => (
                <a
                  key={k}
                  href={
                    "/api/admin/event-poster?event=" + event.id + "&format=" + k
                  }
                >
                  {k === "post"
                    ? "Post · 3:4"
                    : k === "story"
                      ? "Story · 9:16"
                      : "Original poster"}
                </a>
              ))}
          </div>
        </section>
      )}
      {typeof m.public_poster === "string" &&
        m.public_poster.startsWith("/images/") && (
          <a className="focus-text-link" href={m.public_poster}>
            Event poster
          </a>
        )}
      <section>
        <h2>Recorded attendance</h2>
        {people === undefined ? (
          <p role="alert">Attendance unavailable.</p>
        ) : people.length ? (
          <>
            <p>{people.length} linked attendees</p>
            <ul className="portfolio-people-list">
              {people.map((p) => (
                <li key={p.id}>
                  <UsersRound size={16} aria-hidden="true" />
                  {p.name}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>No linked attendance recorded.</p>
        )}
      </section>
      <Link
        className="focus-text-link"
        href={adminUrl("/admin/ai-business/invites")}
      >
        Invites & follow-ups
      </Link>
    </div>
  );
}
export function PeopleOverview({
  contacts,
  today,
}: {
  contacts: InviteContact[];
  today: string;
}) {
  const s = peopleStatistics(contacts, today);
  return (
    <div className="admin-ledger portfolio-people">
      <header className="ledger-title">
        <h1>People</h1>
        <Link href={adminUrl("/admin/ai-business/invites")}>Invite List</Link>
      </header>
      <div className="portfolio-stat-strip">
        <div>
          <UsersRound size={19} />
          <strong>{s.distinct}</strong>
          <span>Distinct attendees</span>
        </div>
        <div>
          <Repeat2 size={19} />
          <strong>{s.returning.length}</strong>
          <span>Returning attendees</span>
        </div>
        <div>
          <Ticket size={19} />
          <strong>{s.visits}</strong>
          <span>Attended visits</span>
        </div>
      </div>
      <p className="portfolio-caption">
        Linked check-ins across {s.events.length} recorded events · {s.contacts}{" "}
        contacts
      </p>
      <div className="portfolio-stats-columns">
        <section>
          <h2>Attendance by event</h2>
          {s.events.length ? (
            <ul className="portfolio-numbers">
              {s.events.map((e) => (
                <li key={e.ref}>
                  <span>
                    {e.title}
                    <small>{eventDate(e.date)}</small>
                  </span>
                  <strong>{e.attendees}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p>No linked attendance yet.</p>
          )}
        </section>
        <section>
          <h2>Came back</h2>
          {s.returning.length ? (
            <ul className="portfolio-numbers">
              {s.returning.slice(0, 10).map((p) => (
                <li key={p.id}>
                  <span>{p.name}</span>
                  <strong>{p.visits.length} visits</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p>No repeat attendance recorded yet.</p>
          )}
          <h2 className="portfolio-followup-heading">Follow-ups</h2>
          <p>
            {s.due.length} due ·{" "}
            <Link href={adminUrl("/admin/ai-business/invites")}>
              Open Invite List
            </Link>
          </p>
        </section>
      </div>
      <details className="week-source">
        <summary>About these numbers</summary>
        <p>
          Attendance uses confirmed check-ins and explicit contact links, not
          similar names or invitation responses. The same person at two events
          is one distinct attendee and two visits. Referral attribution and
          teaching outcomes are not yet available as structured statistics.
        </p>
      </details>
    </div>
  );
}
