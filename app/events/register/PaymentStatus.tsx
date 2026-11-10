"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
type State = {
  state: string;
  lockUntil?: number;
  resumeUrl?: string;
  error?: string;
};
export default function PaymentStatus({
  requestToken,
  onStartOver,
}: {
  requestToken: string | null;
  onStartOver: () => void;
}) {
  const [status, setStatus] = useState<State>({ state: "checking" });
  const [now, setNow] = useState(Date.now);
  const [busy, setBusy] = useState(false);
  async function check(manual = false) {
    setBusy(manual);
    try {
      const response = await fetch("/api/event-registration/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestToken, checkPayment: manual }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Please try again.");
      setStatus(data);
    } catch (e) {
      setStatus((s) => ({
        ...s,
        error: e instanceof Error ? e.message : "Please try again.",
      }));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const response = await fetch("/api/event-registration/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestToken }),
        });
        if (response.ok && alive) {
          const data = await response.json();
          setStatus(data);
          if (
            ["confirmed", "cancelled", "expired", "unknown"].includes(
              data.state,
            ) &&
            timer
          )
            clearInterval(timer);
        }
      } catch {
        /* Keep waiting; never start a replacement payment. */
      }
    }
    void poll();
    const timer = setInterval(() => {
      setNow(Date.now());
      void poll();
    }, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [requestToken]);
  const seconds = Math.max(
    0,
    Math.ceil(((status.lockUntil ?? 0) - now) / 1000),
  );
  if (status.state === "cancelled")
    return (
      <section aria-live="polite">
        <h2>Your registration was cancelled.</h2>
        <p>Contact Edmund if you have questions about your ticket.</p>
      </section>
    );
  if (status.state === "confirmed")
    return (
      <section aria-live="polite">
        <h2>You’re registered.</h2>
        <p>Your place is confirmed. Look out for your QR ticket by email.</p>
        <p>
          <Link href="/account/events">
            Connect your event history to your account →
          </Link>
        </p>
        <button type="button" onClick={onStartOver}>
          Register someone else
        </button>
      </section>
    );
  if (status.state === "expired" || status.state === "unknown")
    return (
      <section aria-live="polite">
        <h2>
          {status.state === "expired"
            ? "Checkout expired."
            : "No active registration found."}
        </h2>
        <p>
          {status.state === "expired"
            ? "That checkout is closed. You can start a new registration."
            : "If you already paid, check your email or contact Edmund before trying again."}
        </p>
        <button type="button" onClick={onStartOver}>
          Start a new registration
        </button>
      </section>
    );
  return (
    <section aria-live="polite">
      <h2>Waiting for payment confirmation.</h2>
      <p>
        We’re waiting for Stripe’s result. Please don’t pay again. Your existing
        registration will be used for any retry.
      </p>
      {seconds > 0 ? (
        <p>
          Payment check available in {Math.floor(seconds / 60)}:
          {String(seconds % 60).padStart(2, "0")}. We’ll confirm automatically
          if Stripe responds sooner.
        </p>
      ) : (
        <button
          type="button"
          disabled={busy || status.state === "checking"}
          onClick={() => void check(true)}
        >
          {busy ? "Checking…" : "Check payment status"}
        </button>
      )}
      {status.resumeUrl && (
        <p>
          <a className="field-button" href={status.resumeUrl}>
            Resume the same payment
          </a>
        </p>
      )}
      {status.error && <p role="alert">{status.error}</p>}
      <p>
        If confirmation is taking longer, contact Edmund. A new payment won’t be
        created while the existing checkout is unresolved.
      </p>
    </section>
  );
}
