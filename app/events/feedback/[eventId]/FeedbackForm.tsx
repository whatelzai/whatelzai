"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { feedbackPath } from "@/lib/event-feedback/model";
import {
  feedbackEmailInput,
  validFeedbackAnswers,
  type FeedbackAnswers,
  type FeedbackFormConfig,
} from "@/lib/event-feedback/questions";
export default function FeedbackForm({
  eventId,
  config,
}: {
  eventId: string;
  config: FeedbackFormConfig;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<FeedbackAnswers>(() =>
      Object.fromEntries(
        config.questions
          .filter((q) => q.type === "text" && q.optional)
          .map((q) => [q.id, ""]),
      ),
    ),
    [email, setEmail] = useState(""),
    [emailCheck, setEmailCheck] = useState<{
      eventId: string;
      email: string;
      status: "checking" | "matched" | "unmatched" | "error";
    } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef(false),
    requestId = useRef<string | null>(null);
  const required = config.questions.filter(
    (q) => q.type !== "text" || !q.optional,
  );
  const count = required.filter((q) => answers[q.id] !== undefined).length;
  async function post(path: string, body: unknown) {
    const r = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await r.json();
    if (!r.ok) throw Error(result.error || "Please try again.");
    return result;
  }
  const normalizedEmail = email.trim().toLowerCase();
  const emailStatus = !normalizedEmail
    ? "idle"
    : emailCheck?.eventId === eventId && emailCheck.email === normalizedEmail
      ? emailCheck.status
      : "pending";
  const matched = emailStatus === "matched";
  useEffect(() => {
    if (!normalizedEmail) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (
        !feedbackEmailInput.safeParse({ eventId, email: normalizedEmail })
          .success
      ) {
        setEmailCheck({ eventId, email: normalizedEmail, status: "unmatched" });
        return;
      }
      setEmailCheck({ eventId, email: normalizedEmail, status: "checking" });
      try {
        const response = await fetch("/api/event-feedback/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId,
            email: normalizedEmail,
            website: "",
          }),
          signal: controller.signal,
        });
        const result = await response.json();
        if (controller.signal.aborted) return;
        setEmailCheck({
          eventId,
          email: normalizedEmail,
          status: response.ok
            ? result.matched === true
              ? "matched"
              : "unmatched"
            : "error",
        });
      } catch {
        if (!controller.signal.aborted)
          setEmailCheck({ eventId, email: normalizedEmail, status: "error" });
      }
    }, 600);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [eventId, normalizedEmail]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending.current) return;
    if (!matched) {
      setError("Please use the email you registered for the event.");
      return;
    }
    if (!validFeedbackAnswers(config, answers)) {
      setError("Please answer all questions.");
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    requestId.current ??= crypto.randomUUID();
    try {
      await post("/api/event-feedback", {
        eventId,
        requestId: requestId.current,
        email,
        formId: config.id,
        answers,
        website: String(new FormData(e.currentTarget).get("website") || ""),
      });
      router.replace(`${feedbackPath(eventId)}/thanks`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Please try again.";
      setError(message);
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="event-feedback-form" aria-busy={busy}>
      <section
        className="feedback-identity"
        aria-labelledby="feedback-email-heading"
      >
        <h2 id="feedback-email-heading">Your registration email</h2>
        <p>Use the email you signed up with for this event.</p>
        <label htmlFor="feedback-email">Email address</label>
        <input
          id="feedback-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
            requestId.current = null;
          }}
          disabled={busy}
          maxLength={254}
          required
          aria-describedby="feedback-email-status"
          aria-invalid={emailStatus === "unmatched" || undefined}
        />
        <p
          id="feedback-email-status"
          role="status"
          className={`feedback-email-status${matched ? " is-matched" : ""}`}
        >
          {matched ? (
            <>
              <svg
                className="feedback-email-tick"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="12" fill="currentColor" />
                <path
                  d="m6.5 12 3.5 3.5 7.5-7.5"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Registration found</span>
            </>
          ) : emailStatus === "unmatched" ? (
            "Please use the email you registered for the event."
          ) : emailStatus === "error" ? (
            "We couldn’t check your email. Please try entering it again."
          ) : emailStatus === "checking" ? (
            "Checking your registration…"
          ) : (
            ""
          )}
        </p>
      </section>
      <div className="feedback-progress">
        <span>{config.questions.length} quick questions</span>
        <span aria-live="polite">
          Required answers: {count} / {required.length}
        </span>
      </div>
      {config.questions.map((q, i) => (
        <fieldset key={q.id} disabled={busy} className="feedback-question">
          <legend>
            {i + 1}. {q.text}
            {q.type === "text" && q.optional && <small> (optional)</small>}
          </legend>
          {q.type === "text" ? (
            <textarea
              name={`question-${q.id}`}
              aria-label={q.text}
              rows={5}
              required={!q.optional}
              value={String(answers[q.id] ?? "")}
              onChange={(e) =>
                setAnswers((previous) => ({
                  ...previous,
                  [q.id]: e.target.value,
                }))
              }
            />
          ) : (
            <div
              className={
                q.type === "rating" ? "feedback-ratings" : "feedback-yes-no"
              }
            >
              {(q.type === "rating" ? [1, 2, 3, 4, 5] : [true, false]).map(
                (value) => (
                  <label key={String(value)}>
                    <input
                      type="radio"
                      name={`question-${q.id}`}
                      value={String(value)}
                      required
                      checked={answers[q.id] === value}
                      onChange={() =>
                        setAnswers((previous) => ({
                          ...previous,
                          [q.id]: value,
                        }))
                      }
                      aria-label={
                        q.type === "rating"
                          ? `${value} out of 5`
                          : value
                            ? "Yes"
                            : "No"
                      }
                    />
                    <span>
                      {q.type === "rating"
                        ? String(value)
                        : value
                          ? "Yes"
                          : "No"}
                    </span>
                  </label>
                ),
              )}
            </div>
          )}
          {q.type === "rating" && (
            <div className="feedback-scale">
              <span>1 · {q.low}</span>
              <span>5 · {q.high}</span>
            </div>
          )}
        </fieldset>
      ))}
      <div className="feedback-honeypot" aria-hidden="true">
        <label>
          Leave this blank
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {error && (
        <p role="alert" className="feedback-error">
          {error}
        </p>
      )}
      <button
        type="submit"
        className="event-primary-button"
        disabled={busy || !matched}
      >
        {busy ? "Please wait…" : "Send feedback →"}
      </button>
      <p className="feedback-private">
        Your answers stay private and are linked to your event registration. No
        account needed.
      </p>
    </form>
  );
}
