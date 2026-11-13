"use client";
import { useRef, useState } from "react";
import { Check, UserCheck, CircleAlert } from "lucide-react";
import { manualCheckin } from "@/lib/event-admin/manual-checkin";
import type { Attendee } from "@/lib/event-admin/model";
export default function ManualCheckin({
  person,
  onCheckedIn,
}: {
  person: Attendee;
  onCheckedIn: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState("");
  const pending = useRef(false);
  if (person.status !== "confirmed" || !person.ticket || person.checkedIn)
    return null;
  return (
    <div className="event-manual-action">
      {done ? (
        <span>
          <span className="event-checked-icon">
            <Check size={12} />
          </span>
          Checked in
        </span>
      ) : (
        <button
          type="button"
          disabled={busy}
          aria-label={`Check in ${person.name}`}
          onClick={async () => {
            if (pending.current) return;
            pending.current = true;
            setBusy(true);
            setError("");
            try {
              const result = await manualCheckin(person, (message) =>
                window.confirm(message),
              );
              if (result) {
                setDone(true);
                onCheckedIn();
              }
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Check-in failed. Retry.",
              );
            } finally {
              pending.current = false;
              setBusy(false);
            }
          }}
        >
          <UserCheck size={16} />
          {busy ? "Checking…" : "Check in"}
        </button>
      )}
      <span role="status" aria-live="polite">
        {error && (
          <>
            <CircleAlert size={16} />
            {error}
          </>
        )}
      </span>
    </div>
  );
}
