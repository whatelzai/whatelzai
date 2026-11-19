import { RETURN_OFFER_COOKIE } from "@/lib/event-return-offer/model";
import {
  loadReturnOffer,
  returnOfferView,
} from "@/lib/event-return-offer/server";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import Image from "next/image";
import {
  mapEvent as legacyEvent,
  registrationCookie,
} from "@/lib/public-events/map";
import {
  loadPublicEvents,
  publicEventNow,
} from "@/lib/public-events/catalog-server";
import {
  resolveEvent,
  eventStarts,
  priceLabel,
} from "@/lib/public-events/catalog";
import { platformRegistrationEnabled } from "@/lib/platform-event-registration";
import RegistrationForm from "./RegistrationForm";
import "../../offers.css";
import "../event-experience.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Register for an event",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string; event?: string; offer?: string }>;
}) {
  const { payment, event, offer: offerMode } = await searchParams;
  const mapEvent = resolveEvent(
    await loadPublicEvents(),
    event || legacyEvent.id,
  );
  if (!mapEvent) notFound();
  let returnOffer = null;
  if (offerMode === "rejoin" && mapEvent.key) {
    try {
      const row = await loadReturnOffer(
        (await cookies()).get(RETURN_OFFER_COOKIE)?.value,
      );
      if (row?.claimed_at && row.target_event_id === mapEvent.recordId)
        returnOffer = await returnOfferView(row, mapEvent.key);
    } catch {
      /* Fail closed to the standard ticket. */
    }
  }
  const hasSignup = Boolean(
    (await cookies()).get(registrationCookie(mapEvent))?.value,
  );
  return (
    <main className="field-wrap event-signup-v2">
      <Link href={mapEvent.path} className="event-back-link">
        ← Event details
      </Link>
      <div className="event-signup-grid">
        <aside className="event-signup-summary" aria-label="Your event">
          {mapEvent.poster && (
            <Image
              src={mapEvent.poster}
              alt={`${mapEvent.title} with Edmund`}
              width={mapEvent.posterWidth}
              height={mapEvent.posterHeight}
              sizes="(max-width: 760px) 100px, 180px"
            />
          )}
          <div className="event-signup-summary-copy">
            <h2>{mapEvent.title}</h2>
            <p>
              {mapEvent.dateLabel}
              <br />
              {mapEvent.timeLabel}
            </p>
            <p>
              {mapEvent.venue}
              <br />
              <span>{mapEvent.address}</span>
            </p>
            {mapEvent.priceMinor !== null && (
              <p className="map-price">
                {mapEvent.originalPriceMinor != null && (
                  <del>{priceLabel(mapEvent.originalPriceMinor)}</del>
                )}
                <strong>{priceLabel(mapEvent.priceMinor)}</strong>
                <span>
                  {returnOffer
                    ? "standard ticket · REJOIN shown below"
                    : "per person · final price"}
                </span>
              </p>
            )}
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
            <p>
              {returnOffer
                ? "Use your previous registration details to book again."
                : "A few details, then you’re on your way."}
            </p>
          </header>
          {eventStarts(mapEvent) <= publicEventNow() ||
          !mapEvent.registrationUrl ? (
            <p>Registration is closed.</p>
          ) : !platformRegistrationEnabled() ? (
            <p>
              Registration is temporarily unavailable. Please try again shortly.
            </p>
          ) : (
            <RegistrationForm
              eventId={mapEvent.id}
              price={priceLabel(mapEvent.priceMinor!)}
              returnOffer={returnOffer}
              checkExisting={hasSignup || Boolean(payment)}
            />
          )}
        </section>
      </div>
    </main>
  );
}
