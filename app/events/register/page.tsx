import { cookies } from "next/headers";
import Link from "next/link";
import Image from "next/image";
import { mapEvent, isMapRegistrationOpen } from "@/lib/public-events/map";
import { platformRegistrationEnabled } from "@/lib/platform-event-registration";
import { EventPrice } from "@/components/events/EventPrice";
import RegistrationForm from "./RegistrationForm";
import "../../offers.css";
import "../event-experience.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Register — Money Mindset × AI Skillset",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const { payment } = await searchParams;
  const hasSignup = Boolean(
    (await cookies()).get("whatelz_event_signup")?.value,
  );
  return (
    <main className="field-wrap event-signup-v2">
      <Link href={mapEvent.path} className="event-back-link">
        ← Event details
      </Link>
      <div className="event-signup-grid">
        <aside className="event-signup-summary" aria-label="Your event">
          <Image
            src="/images/events/money-mindset-ai-skillset-nov12-offer.png"
            alt="Money Mindset × AI Skillset with Edmund"
            width={1024}
            height={1536}
            sizes="(max-width: 760px) 100px, 180px"
          />
          <div className="event-signup-summary-copy">
            <h2>
              Money Mindset
              <br />× AI Skillset
            </h2>
            <p>
              Thursday, 12 November 2026
              <br />
              7:30–9:30 PM · Singapore time
            </p>
            <p>
              The Vibe
              <br />
              <span>{mapEvent.address}</span>
            </p>
            <EventPrice />
          </div>
          <p className="event-signup-ticket-note">
            Your place. Your QR ticket.
            <br />
            All sent to your email.
          </p>
        </aside>
        <section
          className="event-signup-panel"
          aria-labelledby="signup-heading"
        >
          <header>
            <h1 id="signup-heading">Save your seat.</h1>
            <p>A few details, then you’re on your way.</p>
          </header>
          {!isMapRegistrationOpen() ? (
            <p>Registration is closed.</p>
          ) : !platformRegistrationEnabled() ? (
            <p>
              On-site registration is being prepared.{" "}
              <a href={mapEvent.checkoutUrl}>Register →</a>
            </p>
          ) : (
            <RegistrationForm checkExisting={hasSignup || Boolean(payment)} />
          )}
        </section>
      </div>
    </main>
  );
}
