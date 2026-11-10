"use client";
import { useRef, useState, type FormEvent } from "react";
import PaymentStatus from "./PaymentStatus";
export default function RegistrationForm({
  checkExisting = false,
}: {
  checkExisting?: boolean;
}) {
  const token = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const [codeMessage, setCodeMessage] = useState("");
  const [waiting, setWaiting] = useState(checkExisting);
  function requestToken() {
    if (!token.current) {
      try {
        token.current = sessionStorage.getItem("whatelz-event-signup-token");
      } catch {}
      token.current ??= crypto.randomUUID();
      try {
        sessionStorage.setItem("whatelz-event-signup-token", token.current);
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
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Code could not be checked.");
      setApplied(code.trim().toUpperCase());
      setCodeMessage("Applied — free admission. No payment required.");
    } catch (e) {
      setCodeMessage(
        (e instanceof Error ? e.message : "Code not applied.") +
          " You can continue with a S$7 ticket.",
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
        body: JSON.stringify({ reset: true }),
      });
      sessionStorage.removeItem("whatelz-event-signup-token");
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
          code: applied ?? "",
          requestToken: requestToken(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Please try again.");
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
      <PaymentStatus requestToken={null} onStartOver={() => void startOver()} />
    );
  return (
    <form className="event-registration-form" onSubmit={submit}>
      <label>
        Name
        <input name="name" autoComplete="name" required maxLength={160} />
      </label>
      <label>
        Phone number
        <input
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          maxLength={24}
          placeholder="+65 8123 4567"
        />
      </label>
      <label>
        Email address
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
        />
      </label>
      <div>
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
      <div className="registration-honeypot" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <p className="registration-total">
        Your ticket: <strong>{applied ? "Free · S$0" : "S$7"}</strong>
      </p>
      <details className="registration-privacy">
        <summary>How we use your details</summary>
        <p>
          We store your registration in Whatelz’s database, hosted by Supabase.
          Resend receives your email address and ticket for confirmation. For
          paid tickets, we share your email with Stripe to prefill payment.
          Stripe collects required payment and billing details; we don’t send it
          your registration name or phone. Free-code registrations stay on
          Whatelz. Registration does not subscribe you to marketing.
        </p>
      </details>
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
