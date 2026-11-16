"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { feedbackPath } from "@/lib/event-feedback/model";
const labels = [
  "Not useful",
  "A little useful",
  "Useful",
  "Very useful",
  "Excellent",
];
export default function FeedbackForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState<number | null>(null),
    [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    if (!rating) {
      setError("Choose a rating first.");
      return;
    }
    setBusy(true);
    setError("");
    const id = requestId || crypto.randomUUID();
    setRequestId(id);
    const website = String(new FormData(e.currentTarget).get("website") || "");
    try {
      const r = await fetch("/api/event-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          requestId: id,
          rating,
          comment,
          website,
        }),
      });
      const result = await r.json();
      if (!r.ok || !result.ok) throw Error(result.error || "Please try again.");
      router.replace(`${feedbackPath(eventId)}/thanks`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to send. Please try again.",
      );
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="event-feedback-form" aria-busy={busy}>
      <fieldset disabled={busy}>
        <legend>How useful was the session?</legend>
        <div className="feedback-ratings">
          {labels.map((label, i) => (
            <label key={label}>
              <input
                type="radio"
                name="rating"
                value={i + 1}
                required
                checked={rating === i + 1}
                onChange={() => setRating(i + 1)}
              />
              <span>{i + 1}</span>
              <small>{label}</small>
            </label>
          ))}
        </div>
        <label className="feedback-comment" htmlFor="feedback-comment">
          What should I keep or improve? <small>(optional)</small>
        </label>
        <textarea
          id="feedback-comment"
          name="comment"
          rows={3}
          maxLength={1500}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="One thought is plenty."
        />
        <div className="feedback-honeypot" aria-hidden="true">
          <label>
            Leave this blank
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="feedback-error">
          {error}
        </p>
      )}
      <button type="submit" className="event-primary-button" disabled={busy}>
        {busy ? "Sending…" : "Send feedback →"}
      </button>
      <p className="feedback-private">
        No name or email needed. Your feedback stays private.
      </p>
    </form>
  );
}
