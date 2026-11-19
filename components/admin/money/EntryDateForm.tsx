"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Entry } from "@/lib/money/model";
export default function EntryDateForm({
  entry,
  onClose,
  onSaved,
}: {
  entry: Entry;
  onClose: () => void;
  onSaved: (day: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [date, setDate] = useState(entry.occurred_on);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/money", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "entry_date",
          id: entry.id,
          expected_date: entry.occurred_on,
          occurred_on: date,
        }),
      });
      const result = await r.json();
      if (!r.ok) throw Error(result.error || "Could not update date.");
      onSaved(date);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update date.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="money-dialog"
      aria-labelledby="money-date-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <header>
        <h2 id="money-date-title">Edit date</h2>
        <button type="button" onClick={onClose} disabled={busy}>
          Cancel
        </button>
      </header>
      <form onSubmit={save}>
        <p>{entry.description}</p>
        <label>
          Date
          <input
            autoFocus
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min="2000-01-01"
            max="2099-12-31"
            required
            disabled={busy}
          />
        </label>
        <p className="money-note">
          Only the entry date changes.{" "}
          {entry.recurring_id
            ? "The recurring bill schedule stays unchanged."
            : null}
        </p>
        {error ? (
          <p role="alert" className="money-error">
            {error}
          </p>
        ) : null}
        <button
          className="money-primary"
          type="submit"
          disabled={busy || date === entry.occurred_on}
        >
          {busy ? "Saving…" : "Save date"}
        </button>
      </form>
    </dialog>
  );
}
