import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  loadPublicEvents,
  publicEventNow,
} from "@/lib/public-events/catalog-server";
import {
  nextWeeklyEvent,
  upcomingEvents,
  priceLabel,
} from "@/lib/public-events/catalog";
import PastEvents from "@/components/events/PastEvents";
import CatalogCards from "@/components/events/CatalogCards";
import "../offers.css";
import "./event-experience.css";
import "./catalog.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Events with Edmund — AI Skillset & Money Mindset",
  description:
    "Upcoming weekly sessions and previous events with Edmund. Practical AI learning and money mindset, one conversation at a time.",
  alternates: { canonical: "https://whatelz.ai/events" },
};
export default async function Page() {
  const events = await loadPublicEvents(),
    next = nextWeeklyEvent(events, publicEventNow()),
    more = upcomingEvents(events, publicEventNow()).filter(
      (e) => e.format === "weekly" && e.recordId !== next?.recordId,
    );
  return (
    <main className="field-wrap event-hub">
      <header>
        <h1>Learn. Put it to work.</h1>
        <p>
          Weekly sessions with Edmund on AI Skillset and Money Mindset.
          Practical ideas, questions and a useful next step.
        </p>
        <div className="event-hub-actions">
          <Link className="event-primary-button" href="/events/next">
            See the next session ↗
          </Link>
          <a className="text-link" href="#previous-sessions">
            Previous sessions ↓
          </a>
        </div>
      </header>
      {next ? (
        <section className="event-next-feature" aria-labelledby="next-talk">
          {next.poster && (
            <Link href={next.path}>
              <Image
                src={next.poster}
                alt={`${next.title} — ${next.dateLabel}`}
                width={next.posterWidth}
                height={next.posterHeight}
                sizes="(max-width:760px) 100vw, 40vw"
                priority
              />
            </Link>
          )}
          <div>
            <p className="event-next-date">{next.dateLabel}</p>
            <h2 id="next-talk">{next.title}</h2>
            <p>{next.description}</p>
            {next.timeLabel && <p>{next.timeLabel}</p>}
            <p>
              {next.venue}
              {next.address && (
                <>
                  <br />
                  {next.address}
                </>
              )}
            </p>
            {next.capacity !== null && <p>{next.capacity} places</p>}
            {next.priceMinor !== null && (
              <p className="event-next-price">
                {priceLabel(next.priceMinor)} <small>per person</small>
              </p>
            )}
            <Link className="event-primary-button" href={next.path}>
              Details &amp; registration ↗
            </Link>
          </div>
        </section>
      ) : (
        <section className="event-next-empty">
          <h2>The next session is on its way.</h2>
          <p>
            New dates will appear here when they’re published. Explore our
            previous sessions below.
          </p>
        </section>
      )}
      {more.length > 0 && (
        <section className="event-upcoming">
          <h2>Coming up</h2>
          <CatalogCards events={more} />
        </section>
      )}
      <PastEvents />
      <p className="event-hub-bottom">
        Keep learning with{" "}
        <Link href="/playbook">The Money &amp; AI Playbook</Link>, or{" "}
        <Link href="/about">read Edmund’s story</Link>.
      </p>
    </main>
  );
}
