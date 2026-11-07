import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { mapEvent, isMapRegistrationOpen } from "@/lib/public-events/map";
import "../../offers.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Millionair’s AI Playbook — M.A.P.",
  description:
    "AI Skillset × Money Mindset. A two-hour Thursday seminar with Edmund. S$97, limited to 20 participants. Venue to be confirmed.",
  alternates: {
    canonical: "https://whatelz.ai/events/millionairs-ai-playbook",
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
          <p className="offer-label">M.A.P. · AI Skillset × Money Mindset</p>
          <h1>
            Millionair’s
            <br />
            AI Playbook.
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
        </header>
        <section className="map-booking" aria-labelledby="registration-heading">
          <h2 id="registration-heading">
            {open ? "Join the first session" : "Registration closed"}
          </h2>
          <dl>
            <div>
              <dt>When</dt>
              <dd>
                {mapEvent.dateLabel}
                <small>Planned date</small>
              </dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>{mapEvent.timeLabel}</dd>
            </div>
            <div>
              <dt>Where</dt>
              <dd>Venue to be confirmed</dd>
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
                Have a code from Edmund? Enter it at checkout for complimentary
                admission.
              </p>
            </>
          )}
          <p className="booking-note">
            Please note the planned date and unconfirmed venue before
            registering.
          </p>
        </section>
      </div>
      <section className="map-learning">
        <h2>A seminar that becomes a book.</h2>
        <p>
          Each Thursday is a place to teach, ask questions and develop ideas.
          Those lessons will feed into{" "}
          <Link href="/playbook">The Solopreneur’s Playbook</Link>, bringing
          what happens in the room onto the page.
        </p>
        <div className="map-related">
          <Link href="/about">Meet Edmund and read his why ↗</Link>
          <Link href="/testimonials">Hear from people who know his work ↗</Link>
        </div>
      </section>
    </main>
  );
}
