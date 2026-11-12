"use client";
import { useId, useState } from "react";
import dynamic from "next/dynamic";
import { Image as ImageIcon, ScanLine } from "lucide-react";
const Scanner = dynamic(() => import("@/app/event-checkin/Scanner"), {
  loading: () => <p role="status">Opening camera…</p>,
});
const PosterTools = dynamic(() => import("./PosterTools"), {
  loading: () => <p role="status">Opening poster…</p>,
});
export default function EventTools({
  onCheckedIn,
}: {
  onCheckedIn: () => void;
}) {
  const [active, setActive] = useState<"poster" | "scan" | null>(null);
  const id = useId();
  return (
    <div className="event-tools">
      <div className="event-tool-tabs" aria-label="Event tools">
        <button
          type="button"
          aria-expanded={active === "poster"}
          aria-controls={id}
          onClick={() => setActive(active === "poster" ? null : "poster")}
        >
          <ImageIcon size={19} />
          Poster & share
        </button>
        <button
          type="button"
          aria-expanded={active === "scan"}
          aria-controls={id}
          onClick={() => setActive(active === "scan" ? null : "scan")}
        >
          <ScanLine size={19} />
          Scan QR code
        </button>
      </div>
      <div id={id}>
        {active === "poster" && <PosterTools embedded />}
        {active === "scan" && (
          <Scanner autoStart autoCheckIn onCheckedIn={onCheckedIn} />
        )}
      </div>
    </div>
  );
}
