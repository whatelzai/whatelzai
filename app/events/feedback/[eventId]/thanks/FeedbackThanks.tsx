"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { CatalogEvent } from "@/lib/public-events/catalog";
import { priceLabel } from "@/lib/public-events/catalog";
import {
  offerSeconds,
  offerTime,
  type ReturnOfferView,
} from "@/lib/event-return-offer/model";
export default function FeedbackThanks({
  event,
  offer,
  intensive,
}: {
  event: CatalogEvent | null;
  offer: ReturnOfferView | null;
  intensive: CatalogEvent | null;
}) {
  const [showEvent, setShowEvent] = useState(false),
    [seconds, setSeconds] = useState(() => (offer ? offer.initialSeconds : 0)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const introRef = useRef<HTMLElement | null>(null);
  const leavingForSignup = useRef(false),
    dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const timer = setTimeout(
      () => setShowEvent(true),
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : Math.max(
            0,
            2200 -
              Number(introRef.current?.getAnimations?.()[0]?.currentTime ?? 0),
          ),
    );
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!offer) return;
    const timer = setInterval(
      () => setSeconds(offerSeconds(offer.expiresAt)),
      1000,
    );
    return () => clearInterval(timer);
  }, [offer]);
  useEffect(() => {
    if (!offer) return;
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    function dismiss() {
      if (!leavingForSignup.current)
        void fetch("/api/event-return-offer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "dismiss", offerId: offer?.id }),
          keepalive: true,
        }).catch(() => {});
    }
    window.addEventListener("pagehide", dismiss);
    return () => {
      window.removeEventListener("pagehide", dismiss);
      dismissTimer.current = setTimeout(dismiss, 100);
    };
  }, [offer]);
  async function claim() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/event-return-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim", offerId: offer?.id }),
      });
      const data = await r.json();
      if (!r.ok) {
        if (r.status === 409) setSeconds(0);
        throw Error(data.error || "Please try again.");
      }
      const url = new URL(data.registrationUrl, window.location.origin);
      if (
        url.origin !== window.location.origin ||
        url.pathname !== "/events/register"
      )
        throw Error("Registration unavailable.");
      leavingForSignup.current = true;
      window.location.assign(url.href);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
      setBusy(false);
    }
  }
  const active = !!offer && seconds > 0;
  return (
    <main
      className={`field-wrap event-feedback feedback-thanks${showEvent ? " shows-event" : ""}`}
    >
      <section className="feedback-thanks-intro" aria-hidden={showEvent}>
        <svg
          className="feedback-big-tick"
          viewBox="0 0 120 120"
          aria-hidden="true"
        >
          <circle cx="60" cy="60" r="60" fill="currentColor" />
          <path
            d="m32 60 19 19 38-38"
            fill="none"
            stroke="white"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <h1>Thank you for your feedback.</h1>
      </section>
      <section
        className="feedback-return-stage"
        aria-hidden={!showEvent}
        inert={!showEvent}
        aria-labelledby="feedback-return-title"
      >
        {event ? (
          <article className="feedback-return-card">
            {event.poster && (
              <Image
                src={event.poster}
                width={event.posterWidth}
                height={event.posterHeight}
                alt={`${event.title} poster`}
                sizes="(max-width:760px) 75vw, 300px"
                priority
              />
            )}
            <div className="feedback-return-copy">
              <p>Your next session</p>
              <h1 id="feedback-return-title">{event.title}</h1>
              <p>
                {event.dateLabel}
                <br />
                {event.timeLabel}
              </p>
              {active ? (
                <>
                  <p className="feedback-return-incentive">
                    Your return-attendee offer
                  </p>
                  <p className="feedback-return-price">
                    {event.originalPriceMinor != null && (
                      <del>{priceLabel(event.originalPriceMinor)}</del>
                    )}
                    <del>{priceLabel(offer.regularAmount)}</del>
                    <strong>{priceLabel(offer.amount)}</strong>
                  </p>
                  <p>For your checked-in attendee email.</p>
                  <p className="feedback-offer-timer">
                    Offer ends in{" "}
                    <strong role="timer" aria-label="Time remaining">
                      {offerTime(seconds)}
                    </strong>
                  </p>
                  <p className="feedback-return-note">
                    Start checkout within five minutes. This offer ends when you
                    leave this page without claiming it.
                  </p>
                  <button
                    className="event-primary-button"
                    disabled={busy}
                    onClick={() => void claim()}
                  >
                    {busy
                      ? "Opening registration…"
                      : `Book for ${priceLabel(offer.amount)} →`}
                  </button>
                </>
              ) : (
                <>
                  <p className="feedback-return-price">
                    {event.originalPriceMinor != null && (
                      <del>{priceLabel(event.originalPriceMinor)}</del>
                    )}
                    {event.priceMinor != null && (
                      <strong>{priceLabel(event.priceMinor)}</strong>
                    )}
                  </p>
                  {offer && (
                    <p>
                      Your five-minute offer has ended. The standard ticket is
                      still available.
                    </p>
                  )}
                  {event.registrationUrl ? (
                    <Link
                      className="event-primary-button"
                      href={event.registrationUrl}
                    >
                      Register →
                    </Link>
                  ) : (
                    <Link className="event-primary-button" href={event.path}>
                      View session →
                    </Link>
                  )}
                </>
              )}
              {error && <p role="alert">{error}</p>}
              <p className="feedback-return-note">
                Your feedback has been saved. Thank you for helping shape the
                next session.
              </p>
            </div>
          </article>
        ) : (
          <>
            <h1 id="feedback-return-title">Thank you for your feedback.</h1>
            <p>Your feedback has been saved.</p>
            <Link href="/events">Explore upcoming events →</Link>
          </>
        )}
        {intensive && (
          <Link className="feedback-return-intensive" href={intensive.path}>
            Also coming up: {intensive.title} · {intensive.dateLabel} ↗
          </Link>
        )}
      </section>
      <p className="sr-only" role="status">
        {showEvent
          ? "Your feedback has been saved. The next event is ready to view."
          : ""}
      </p>
      <noscript>
        <p>
          Your feedback has been saved.{" "}
          <a href={event?.path || "/events"}>See the next event</a>.
        </p>
      </noscript>
    </main>
  );
}
