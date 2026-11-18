"use client";
import {
  offerSeconds,
  offerTime,
  type ReturnOfferView,
} from "@/lib/event-return-offer/model";
import { useEffect, useRef, useState, type FormEvent } from "react";
import PaymentStatus from "./PaymentStatus";
export default function RegistrationForm({
  checkExisting = false,
  eventId = "ELZ-EVT-0004",
  price = "S$7",
  returnOffer = null,
}: {
  checkExisting?: boolean;
  eventId?: string;
  price?: string;
  returnOffer?: ReturnOfferView | null;
}) {
  const storageKey = `whatelz-event-signup-token:${eventId}`;
  const token = useRef<string | null>(null);
  const [needsDetails, setNeedsDetails] = useState(false);
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const [codeMessage, setCodeMessage] = useState("");
  const [waiting, setWaiting] = useState(checkExisting);
  const [returnEnabled, setReturnEnabled] = useState(!!returnOffer),
    [returnSeconds, setReturnSeconds] = useState(() =>
      returnOffer ? returnOffer.initialSeconds : 0,
    ),
    [registrationEmail, setRegistrationEmail] = useState(
      returnOffer?.email || "",
    );
  const returnActive = !!returnOffer && returnEnabled && returnSeconds > 0;
  const totalPrice = returnActive ? `S$${returnOffer.amount / 100}` : price;
  useEffect(() => {
    if (!returnOffer) return;
    const timer = setInterval(
      () => setReturnSeconds(offerSeconds(returnOffer.expiresAt)),
      1000,
    );
    return () => clearInterval(timer);
  }, [returnOffer]);

  function requestToken() {
    if (!token.current) {
      try {
        token.current = sessionStorage.getItem(storageKey);
      } catch {}
      token.current ??= crypto.randomUUID();
      try {
        sessionStorage.setItem(storageKey, token.current);
      } catch {
        /* Cookie also survives the payment return. */
      }
    }
    return token.current;
  }
  async function apply() {
    if (applying || busy) return;
    setApplying(true);
    setApplied(null);
    setCodeMessage("");
    try {
      const response = await fetch("/api/event-registration/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, eventId }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Code could not be checked.");
      setApplied(code.trim().toUpperCase());
      setCodeMessage("Code applied. No payment required.");
    } catch (e) {
      setCodeMessage(
        (e instanceof Error ? e.message : "Code not applied.") +
          ` You can continue with a ${price} ticket.`,
      );
    } finally {
      setApplying(false);
    }
  }
  async function startOver() {
    try {
      await fetch("/api/event-registration/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true, eventId }),
      });
      sessionStorage.removeItem(storageKey);
    } catch {}
    token.current = null;
    setWaiting(false);
    setError("");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || applying) return;
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/event-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(form),
          eventId,
          code: returnActive ? "" : (applied ?? ""),
          returnOffer: returnActive,
          requestToken: requestToken(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.needsDetails) setNeedsDetails(true);
        if (data.offerExpired) {
          setReturnEnabled(false);
          setReturnSeconds(0);
        }
        throw Error(data.error || "Please try again.");
      }
      if (data.checkoutUrl) {
        const url = new URL(data.checkoutUrl);
        if (url.origin !== "https://checkout.stripe.com")
          throw Error("Payment unavailable.");
        setWaiting(true);
        window.location.assign(url.href);
      } else if (data.confirmed) setWaiting(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  if (waiting)
    return (
      <PaymentStatus
        eventId={eventId}
        requestToken={null}
        onStartOver={() => void startOver()}
      />
    );
  return (
    <form className="event-registration-form" onSubmit={submit}>
      {(!returnActive || needsDetails) && (
        <>
          <label>
            Name
            <input
              name="name"
              autoComplete="name"
              placeholder="Your full name"
              required
              maxLength={160}
            />
          </label>
          <div className="event-form-field">
            <label htmlFor="event-phone">Phone number</label>
            <input
              id="event-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              required
              maxLength={24}
              placeholder="e.g. +65 8123 4567"
              aria-describedby="event-phone-hint"
            />
            <span id="event-phone-hint" className="event-input-hint">
              Include your country code, e.g. +65 or +60.
            </span>
          </div>
        </>
      )}
      <div className="event-form-field">
        <label htmlFor="event-email">Email address</label>
        <input
          value={registrationEmail}
          onChange={(e) => setRegistrationEmail(e.target.value)}
          readOnly={returnActive}
          id="event-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          placeholder="you@example.com"
          aria-describedby="event-email-hint"
        />
        <span id="event-email-hint" className="event-input-hint">
          We’ll send your QR ticket here.
        </span>
      </div>
      {returnActive ? (
        <div className="event-return-applied" role="status">
          <strong>✓ REJOIN applied!</strong>
          <p>
            Your checked-in attendee ticket: {totalPrice}. Start checkout in{" "}
            <span role="timer">{offerTime(returnSeconds)}</span>.
          </p>
          <button
            type="button"
            onClick={() => {
              setReturnEnabled(false);
              setRegistrationEmail("");
            }}
          >
            Use a different email at {price}
          </button>
        </div>
      ) : (
        <>
          {returnOffer && (
            <p role="status">
              The REJOIN offer is no longer active. Your ticket is {price}.
            </p>
          )}
          <div className="event-promo-field">
            <label htmlFor="event-promo">Promo code (optional)</label>
            <div className="event-promo-row">
              <input
                id="event-promo"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setApplied(null);
                  setCodeMessage("");
                }}
                autoComplete="off"
                maxLength={64}
              />
              <button
                type="button"
                disabled={applying || busy || !code.trim()}
                onClick={() => void apply()}
              >
                {applying ? "Checking…" : "Apply"}
              </button>
            </div>
            {codeMessage && <p role="status">{codeMessage}</p>}
          </div>
        </>
      )}
      <div className="registration-honeypot" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <p className="registration-total">
        Ticket total{" "}
        <strong>{returnActive ? totalPrice : applied ? "S$0" : price}</strong>
      </p>
      {error && <p role="alert">{error}</p>}
      <button
        className="field-button"
        type="submit"
        disabled={busy || applying}
      >
        {busy
          ? "Registering…"
          : applied
            ? "Confirm registration"
            : returnActive
              ? `Pay ${totalPrice}`
              : "Proceed to payment"}
      </button>
      {error && (
        <button type="button" onClick={() => void startOver()} disabled={busy}>
          Start over
        </button>
      )}
    </form>
  );
}
