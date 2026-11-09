import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { mapEvent, isMapRegistrationOpen } from "@/lib/public-events/map";
import "../offers.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "M.A.P. — Thursday seminars",
  description:
    "Millionair’s AI Playbook: two hours every Thursday exploring AI Skillset × Money Mindset with Edmund.",
  alternates: { canonical: "https://whatelz.ai/events" },
};
export default function EventsPage() {
  const open = isMapRegistrationOpen();
  return (
    <main className="map-events field-wrap">
      <header className="events-intro">
        <p className="offer-label">Thursdays with Edmund</p>
        <h1>Find your M.A.P.</h1>
        <p>
          Millionair’s AI Playbook.
          <br />
          AI Skillset × Money Mindset, two hours every Thursday.
        </p>
      </header>
      <section className="event-listing" aria-labelledby="next-talk">
        <Image
          className="map-poster-photo"
          src="/images/events/map-edmund-poster-v3.png"
          alt="M.A.P. Thursday seminar poster featuring Edmund speaking."
          width={1024}
          height={1536}
          sizes="(max-width:700px) 100vw, 40vw"
        />
        <div className="offer-copy">
          <h2 id="next-talk">{mapEvent.title}</h2>
          <p>
            {open
              ? "First session: Thursday, 12 November 2026."
              : "The next session will be announced here."}
          </p>
          <p>
            7:30–9:30 PM · UTC+8
            <br />
            20 participants maximum · S$97
            <br />
            {mapEvent.venue}
            <br />
            {mapEvent.address}
          </p>
          <Link className="field-button" href={mapEvent.path}>
            {open ? "Details & registration" : "About the seminar"}
            <ArrowUpRight size={20} />
          </Link>
        </div>
      </section>
      <section className="events-book-note">
        <h2>From the room to the page.</h2>
        <p>
          The lessons taught here will become part of{" "}
          <Link href="/playbook">The Solopreneur’s Playbook</Link>. Join the
          conversation, then keep learning with the book.
        </p>
      </section>
    </main>
  );
}
