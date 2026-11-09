import { pastThursdayEvents } from "@/lib/public-events/past";

export default function PastEvents() {
  return (
    <section className="past-events" aria-labelledby="past-events-heading">
      <p className="offer-label">Thursdays with Edmund</p>
      <h2 id="past-events-heading">Past sessions.</h2>
      <ul>
        {pastThursdayEvents.map((event) => (
          <li key={event.date}>
            <time dateTime={event.date}>{event.label}</time>
            <span>Thursday seminar with Edmund</span>
            <span>{event.attendance}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
