"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { ScanLine } from "lucide-react";
const Scanner = dynamic(() => import("@/app/event-checkin/Scanner"), {
  loading: () => <p role="status">Opening scanner…</p>,
});
export default function ScanTickets({
  onCheckedIn,
}: {
  onCheckedIn: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="event-scan-tools"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>
        <ScanLine size={20} />
        Check in attendees
      </summary>
      {open && <Scanner onCheckedIn={onCheckedIn} />}
    </details>
  );
}
