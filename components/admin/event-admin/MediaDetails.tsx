"use client";
import { useState } from "react";
import type { EventMediaFile } from "@/lib/event-admin/media-policy";
export default function MediaDetails({
  file,
  onSaved,
}: {
  file: EventMediaFile;
  onSaved: (file: EventMediaFile) => void;
}) {
  const [title, setTitle] = useState(file.title),
    [description, setDescription] = useState(file.description),
    [people, setPeople] = useState(file.people.join(", ")),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("");
  return (
    <details className="media-details">
      <summary>Description & people</summary>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setStatus("Saving…");
          try {
            const response = await fetch("/api/admin/event-media", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                path: file.path,
                title,
                description,
                people: people
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean),
                revision: file.revision,
              }),
              cache: "no-store",
            });
            const d = await response.json();
            if (!response.ok) throw Error(d.error);
            onSaved({ ...file, ...d });
            setStatus("Saved.");
          } catch (e) {
            setStatus(
              e instanceof Error ? e.message : "Could not save. Retry.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Name
          <input
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={file.name}
          />
        </label>
        <label>
          Description
          <textarea
            value={description}
            maxLength={2000}
            rows={3}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is happening? How could this photo be reused?"
          />
        </label>
        <label>
          People
          <input
            value={people}
            maxLength={970}
            onChange={(e) => setPeople(e.target.value)}
            placeholder="Names, separated by commas"
          />
        </label>
        <small>
          Names you confirm manually; no automatic face recognition.
        </small>
        <button disabled={busy} type="submit">
          {busy ? "Saving…" : "Save details"}
        </button>
        <p role="status">{status}</p>
      </form>
    </details>
  );
}
