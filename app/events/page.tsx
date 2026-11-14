import type { Metadata } from "next";
import Link from "next/link";
import PastEvents from "@/components/events/PastEvents";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import {
  currentEvent as mapEvent,
  isSeminarOpen,
} from "@/lib/public-events/map";
import { EventPrice } from "@/components/events/EventPrice";
import "../offers.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Money Mindset × AI Skillset — Thursday seminars",
  description:
    "Money Mindset × AI Skillset: two hours every Thursday exploring AI Skillset × Money Mindset with Edmund.",
  alternates: { canonical: "https://whatelz.ai/events" },
};
export default function EventsPage() {
  const open = isSeminarOpen(mapEvent);
  return (
    <main className="map-events field-wrap">
      <header className="events-intro">
        <p className="offer-label">Thursdays with Edmund</p>
        <h1>Money Mindset × AI Skillset</h1>
        <p>
          A Thursday seminar with Edmund Lin.
          <br />
          Two hours to learn, ask questions and put ideas into practice.
        </p>
      </header>
      <section className="event-listing" aria-labelledby="next-talk">
        <Image
          className="map-poster-photo"
          src={mapEvent.poster}
          alt="Money Mindset × AI Skillset seminar poster featuring Edmund speaking."
          width={1080}
          height={1440}
          sizes="(max-width:700px) 100vw, 40vw"
        />
        <div className="offer-copy">
          <h2 id="next-talk">{mapEvent.title}</h2>
          <p>30 places for the next Thursday session.</p>
          <p>
            {open
              ? `Next session: ${mapEvent.dateLabel}.`
              : "The next session will be announced here."}
          </p>
          <p>
            7:30–9:30 PM · UTC+8
            <br />
            {mapEvent.capacity} participants maximum
            <br />
            {mapEvent.venue}
            <br />
            {mapEvent.address}
          </p>
          <EventPrice event={mapEvent} />
          <Link className="field-button" href={mapEvent.path}>
            {open ? "Details & registration" : "About the seminar"}
            <ArrowUpRight size={20} />
          </Link>
        </div>
      </section>
      <PastEvents />
      <section className="events-book-note">
        <h2>From the room to the page.</h2>
        <p>
          The lessons taught here will become part of{" "}
          <Link href="/playbook">The Money & AI Playbook</Link>. Join the
          conversation, then keep learning with the book.
        </p>
      </section>
    </main>
  );
}
