import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pastThursdayEvents } from "@/lib/public-events/past";
import { mapEvent } from "@/lib/public-events/map";
import "../../offers.css";
export function generateStaticParams() {
  return pastThursdayEvents.map((event) => ({ date: event.date }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>;
}): Promise<Metadata> {
  const { date } = await params;
  const event = pastThursdayEvents.find((event) => event.date === date);
  if (!event) return { title: "Event not found" };
  return {
    title: `${event.title} — ${event.label}`,
    description: `Past Thursday seminar with Edmund at ${event.venue}. ${event.participants} participants.`,
    alternates: { canonical: `https://whatelz.ai${event.path}` },
  };
}
export default async function PastEventPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const event = pastThursdayEvents.find((event) => event.date === date);
  if (!event) notFound();
  return (
    <main className="map-events field-wrap">
      <Link href="/events" className="text-link">
        ← All events
      </Link>
      <header className="events-intro">
        <p className="offer-label">Past event · Thursdays with Edmund</p>
        <h1>{event.title}</h1>
        <p>
          <time dateTime={event.date}>{event.label}</time>
        </p>
      </header>
      <section
        className="event-listing past-event-detail"
        aria-labelledby="past-session-details"
      >
        <Image
          className="map-poster-photo"
          src={event.poster}
          alt={`Poster for the ${event.label} session with Edmund`}
          width={1024}
          height={1536}
          sizes="(max-width:700px) 100vw, 40vw"
        />
        <div className="offer-copy">
          <h2 id="past-session-details">At {event.venue}.</h2>
          <p>
            Thursday, {event.label}
            <br />
            {event.participants} participants
          </p>
          <p>This event has ended.</p>
          <Link href={mapEvent.path} className="field-button">
            See the next session ↗
          </Link>
        </div>
      </section>
    </main>
  );
}
