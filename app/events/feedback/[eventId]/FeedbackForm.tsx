"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { feedbackPath } from "@/lib/event-feedback/model";
import {
  validFeedbackAnswers,
  type FeedbackAnswers,
  type FeedbackFormConfig,
} from "@/lib/event-feedback/questions";
type Proof = { verificationId: string; token: string };
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
    [code, setCode] = useState(""),
    [challenge, setChallenge] = useState<string | null>(null),
    [proof, setProof] = useState<Proof | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
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
  async function emailAction(action: "send" | "verify") {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (action === "send") {
        const r = await post("/api/event-feedback/request-code", {
          eventId,
          email,
          website: "",
        });
        setChallenge(r.verificationId);
        setCode("");
        setNotice(r.message);
      } else {
        const r = await post("/api/event-feedback/verify-code", {
          eventId,
          verificationId: challenge,
          code,
        });
        setProof({ verificationId: challenge!, token: r.token });
        setCode("");
        setNotice("Email verified. You can now send your feedback.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending.current) return;
    if (!proof) {
      setError("Verify the email you registered with before submitting.");
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
        verificationId: proof.verificationId,
        token: proof.token,
        formId: config.id,
        answers,
        website: String(new FormData(e.currentTarget).get("website") || ""),
      });
      router.replace(`${feedbackPath(eventId)}/thanks`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Please try again.";
      setError(message);
      if (message.includes("verification has expired")) {
        setProof(null);
        setChallenge(null);
        setNotice("");
      }
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
        <p>Use the email you signed up with. We’ll send a code to verify it.</p>
        <label htmlFor="feedback-email">Email address</label>
        <input
          id="feedback-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setChallenge(null);
            setProof(null);
            requestId.current = null;
            setNotice("");
          }}
          readOnly={!!proof}
          disabled={busy}
          maxLength={254}
          required
        />
        {!proof && (
          <button
            type="button"
            className="feedback-secondary"
            disabled={busy || !email}
            onClick={() => void emailAction("send")}
          >
            {challenge ? "Send a new code" : "Send verification code"}
          </button>
        )}
        {challenge && !proof && (
          <div className="feedback-code">
            <label htmlFor="feedback-code">Six-digit code</label>
            <input
              id="feedback-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              disabled={busy}
            />
            <button
              type="button"
              className="feedback-secondary"
              disabled={busy || code.length !== 6}
              onClick={() => void emailAction("verify")}
            >
              Verify email
            </button>
          </div>
        )}
        {proof && (
          <button
            type="button"
            className="feedback-secondary"
            disabled={busy}
            onClick={() => {
              setProof(null);
              setChallenge(null);
              setNotice("");
              requestId.current = null;
            }}
          >
            Use another email
          </button>
        )}
        <p role="status">{notice}</p>
        {error && !proof && (
          <p
            role="alert"
            className="feedback-error"
            id="feedback-verification-error"
          >
            {error}
          </p>
        )}
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
      {error && proof && (
        <p role="alert" className="feedback-error">
          {error}
        </p>
      )}
      <button
        type="submit"
        className="event-primary-button"
        disabled={busy || !proof}
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
