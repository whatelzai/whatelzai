import { platformRegistrationEnabled } from "@/lib/platform-event-registration";
import EventWriteup from "@/components/events/EventWriteup";
import { EventPrice } from "@/components/events/EventPrice";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PastEvents from "@/components/events/PastEvents";
import { ArrowUpRight } from "lucide-react";
import { mapEvent, isMapRegistrationOpen } from "@/lib/public-events/map";
import "../../offers.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Money Mindset × AI Skillset",
  description:
    "AI Skillset × Money Mindset. Join Edmund on 12 November for S$7 (originally S$97), limited to 20 participants. At The Vibe, Paya Lebar Square.",
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
          <Image
            className="map-detail-poster"
            src="/images/events/money-mindset-ai-skillset-nov12-offer.png"
            alt="Money Mindset × AI Skillset with Edmund, 12 November 2026 at The Vibe. Original S$97 crossed out, now S$7."
            width={1024}
            height={1536}
            sizes="(max-width: 700px) 100vw, 430px"
            priority
          />
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
          <EventPrice />
          {open && (
            <>
              <a
                href={
                  platformRegistrationEnabled()
                    ? "/events/register"
                    : mapEvent.checkoutUrl
                }
                className="field-button"
              >
                Register <ArrowUpRight size={20} />
              </a>
              <p className="booking-note">
                Name, phone number and email are required to register. Have a
                first-time joiner code from Edmund? Enter it for free admission
                (S$0).
              </p>
            </>
          )}
        </section>
      </div>
      <EventWriteup eventId={mapEvent.id} />
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
