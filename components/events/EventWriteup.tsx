import { eventWriteups } from "@/lib/public-events/writeups";
export default function EventWriteup({ eventId }: { eventId: string }) {
  const writeup = eventWriteups[eventId];
  if (!writeup) return null;
  return (
    <section className="event-writeup" aria-labelledby="event-writeup-heading">
      <h2 id="event-writeup-heading">{writeup.heading}</h2>
      {writeup.paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      {writeup.agenda && (
        <div className="event-agenda">
          <h3>Evening schedule</h3>
          <p>Thursday, 12 November · Singapore time</p>
          <dl>
            {writeup.agenda.map(({ time, activity }) => (
              <div key={time}>
                <dt>{time}</dt>
                <dd>{activity}</dd>
              </div>
            ))}
          </dl>
          {writeup.reminder && (
            <p className="event-agenda-reminder">
              <strong>{writeup.reminder}</strong>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
