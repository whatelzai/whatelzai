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
    </section>
  );
}
