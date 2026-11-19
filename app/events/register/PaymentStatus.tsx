"use client";
import { useEffect, useState } from "react";
import { Check, Clock3, X } from "lucide-react";
type State = {
  state: string;
  lockUntil?: number;
  resumeUrl?: string;
  error?: string;
};
export default function PaymentStatus({
  requestToken,
  onStartOver,
  eventId = "ELZ-EVT-0004",
}: {
  requestToken: string | null;
  eventId?: string;
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
        body: JSON.stringify({ requestToken, checkPayment: manual, eventId }),
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
          body: JSON.stringify({ requestToken, eventId }),
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
  }, [requestToken, eventId]);
  useEffect(() => {
    // Tick independently of the network poll so the countdown moves every second.
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, []);
  const seconds = Math.max(
    0,
    Math.ceil(((status.lockUntil ?? 0) - now) / 1000),
  );
  return (
    <PaymentStatusView
      status={status}
      seconds={seconds}
      busy={busy}
      onCheck={() => void check(true)}
      onStartOver={onStartOver}
    />
  );
}

export function PaymentStatusView({
  status,
  seconds,
  busy,
  onCheck,
  onStartOver,
}: {
  status: State;
  seconds: number;
  busy: boolean;
  onCheck: () => void;
  onStartOver: () => void;
}) {
  const confirmed = status.state === "confirmed";
  const ended = ["cancelled", "expired", "unknown"].includes(status.state);
  const checking = status.state === "checking";
  const tone = confirmed ? "success" : ended ? "ended" : "waiting";
  const Icon = confirmed ? Check : ended ? X : Clock3;
  const title = confirmed
    ? "You’re registered!"
    : status.state === "cancelled"
      ? "Registration cancelled"
      : status.state === "expired"
        ? "Checkout expired"
        : status.state === "unknown"
          ? "No registration found"
          : checking
            ? "Checking your registration"
            : "Confirming your payment";
  const message = confirmed
    ? "Your QR ticket is on its way to your inbox."
    : status.state === "cancelled"
      ? "Contact Edmund if you need help with your ticket."
      : status.state === "expired"
        ? "This checkout is closed. You can register again."
        : status.state === "unknown"
          ? "Already paid? Check your email or contact Edmund before retrying."
          : "We’ll update this page automatically. Please don’t pay again.";
  return (
    <section
      className={`payment-status payment-status--${tone}`}
      aria-label="Registration status"
    >
      <div className="payment-status-heading" role="status">
        <span className="payment-status-icon" aria-hidden="true">
          <Icon size={28} strokeWidth={2.5} />
        </span>
        <div>
          <h2>{title}</h2>
          <p>{message}</p>
        </div>
      </div>
      {!confirmed && !ended && !checking && (
        <div className="payment-status-countdown">
          <span
            className="payment-status-time"
            role="timer"
            aria-label="Time until payment check is available"
            aria-live="off"
          >
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
          </span>
          <p>
            {seconds > 0
              ? "until you can check again"
              : "Still waiting for confirmation"}
          </p>
        </div>
      )}
      <div className="payment-status-actions">
        {confirmed ? (
          <>
            <button
              className="payment-status-secondary"
              type="button"
              onClick={onStartOver}
            >
              Register someone else
            </button>
          </>
        ) : ended ? (
          status.state !== "cancelled" && (
            <button
              className="field-button"
              type="button"
              onClick={onStartOver}
            >
              Start a new registration
            </button>
          )
        ) : !checking && seconds === 0 ? (
          <button
            className="field-button"
            type="button"
            disabled={busy}
            onClick={onCheck}
          >
            {busy ? "Checking…" : "Check payment status"}
          </button>
        ) : null}
        {!confirmed && !ended && status.resumeUrl && (
          <a className="payment-status-secondary" href={status.resumeUrl}>
            Continue payment →
          </a>
        )}
      </div>
      {status.error && (
        <p className="payment-status-error" role="alert">
          {status.error}
        </p>
      )}
    </section>
  );
}
