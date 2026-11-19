"use client";

import { useState } from "react";

export function ContactForm({
  fallbackEmail,
  initialMessage = "",
  submitLabel = "Send",
  successMessage = "Got it — I’ll get back to you soon.",
}: {
  fallbackEmail: string;
  initialMessage?: string;
  submitLabel?: string;
  successMessage?: string;
}) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(initialMessage);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, message }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Request failed");
      }

      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div
        role="status"
        className="mt-10 border-l-2 border-[var(--accent)] pl-6 py-2"
      >
        <p className="font-mono text-xs tracking-widest text-zinc-500 uppercase">
          Sent
        </p>
        <p className="mt-1 text-base text-zinc-700">{successMessage}</p>
      </div>
    );
  }

  const inputCls =
    "w-full border-b border-zinc-200 bg-transparent py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none transition-colors";

  return (
    <form onSubmit={handleSubmit} className="mt-10 space-y-6 max-w-xl">
      <div>
        <input
          id="cf-email"
          aria-label="Your email"
          autoComplete="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
          placeholder="Your email"
        />
      </div>

      <div>
        <textarea
          id="cf-message"
          aria-label="Your message"
          required
          maxLength={2000}
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={`${inputCls} resize-none`}
          placeholder="What's on your mind?"
        />
      </div>

      {status === "error" && (
        <p role="alert" className="font-mono text-xs text-red-500">
          Something went wrong — email {fallbackEmail} directly
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="inline-flex items-center gap-2 border border-zinc-900 px-5 py-3 font-mono text-xs tracking-widest uppercase transition-colors hover:bg-[var(--accent)] hover:text-zinc-900 disabled:opacity-50"
      >
        {status === "sending" ? "Sending…" : submitLabel}
        <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
