import type { Metadata } from "next";
import Link from "next/link";
import PastEvents from "@/components/events/PastEvents";
import { ArrowUpRight } from "lucide-react";
import { mapEvent, isMapRegistrationOpen } from "@/lib/public-events/map";
import "../../offers.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Money Mindset × AI Skillset",
  description:
    "AI Skillset × Money Mindset. A two-hour Thursday seminar with Edmund. S$97, limited to 20 participants. At The Vibe, Paya Lebar Square.",
  alternates: {
    canonical: "https://whatelz.ai/events/money-mindset-ai-skillset",
  },
};
export default function MapPage() {
  const open = isMapRegistrationOpen();
  return (
    <main className="map-detail field-wrap">
      <Link href="/events" className="text-link">
        ← All events
      </Link>
      <div className="map-detail-grid">
        <header>
          <p className="offer-label">Thursdays with Edmund · {mapEvent.id}</p>
          <h1>
            Money Mindset
            <br />× AI Skillset.
          </h1>
          <p className="map-deck">
            Two hours. A small room.
            <br />
            Ideas to put into practice.
          </p>
          <p>
            A weekly Thursday seminar with Edmund, bringing money mindset and
            practical AI learning into the same conversation.
          </p>
          <p>After three 10-person sessions, the next session has 20 places.</p>
        </header>
        <section className="map-booking" aria-labelledby="registration-heading">
          <h2 id="registration-heading">
            {open ? "Join the next session" : "Registration closed"}
          </h2>
          <dl>
            <div>
              <dt>When</dt>
              <dd>{mapEvent.dateLabel}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>{mapEvent.timeLabel}</dd>
            </div>
            <div>
              <dt>Where</dt>
              <dd>
                <a
                  href={mapEvent.venueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {mapEvent.venue} ↗
                </a>
                <small>{mapEvent.address}</small>
              </dd>
            </div>
            <div>
              <dt>Room size</dt>
              <dd>20 participants maximum</dd>
            </div>
          </dl>
          <p className="map-price">
            S$97 <span>per person · final price</span>
          </p>
          {open && (
            <>
              <a href={mapEvent.checkoutUrl} className="field-button">
                Register with Stripe <ArrowUpRight size={20} />
              </a>
              <p className="booking-note">
                Name, phone number and email are required at checkout. Have a
                code from Edmund? Enter it for complimentary admission.
              </p>
            </>
          )}
        </section>
      </div>
      <PastEvents />
      <section className="map-learning">
        <h2>A seminar that becomes a book.</h2>
        <p>
          Each Thursday is a place to teach, ask questions and develop ideas.
          Those lessons will feed into{" "}
          <Link href="/playbook">The Money & AI Playbook</Link>, bringing what
          happens in the room onto the page.
        </p>
        <div className="map-related">
          <Link href="/about">Meet Edmund and read his why ↗</Link>
          <Link href="/testimonials">Hear from people who know his work ↗</Link>
        </div>
      </section>
    </main>
  );
}
