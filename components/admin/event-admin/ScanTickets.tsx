"use client";
import { useId, useState } from "react";
import dynamic from "next/dynamic";
import { Image as ImageIcon, ScanLine, Images } from "lucide-react";
const Scanner = dynamic(() => import("@/app/event-checkin/Scanner"), {
  loading: () => <p role="status">Opening camera…</p>,
});
const PosterTools = dynamic(() => import("./PosterTools"), {
  loading: () => <p role="status">Opening poster…</p>,
});
const EventMedia = dynamic(() => import("./EventMedia"), {
  loading: () => <p role="status">Opening media…</p>,
});
export default function EventTools({
  onCheckedIn,
}: {
  onCheckedIn: () => void;
}) {
  const [active, setActive] = useState<"poster" | "scan" | "media" | null>(
    null,
  );
  const [mediaOpened, setMediaOpened] = useState(false);
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
        <button
          type="button"
          aria-expanded={active === "media"}
          aria-controls={id}
          onClick={() => {
            setMediaOpened(true);
            setActive(active === "media" ? null : "media");
          }}
        >
          <Images size={19} />
          Media upload
        </button>
      </div>
      <div id={id}>
        {active === "poster" && <PosterTools embedded />}
        {active === "scan" && (
          <Scanner autoStart autoCheckIn onCheckedIn={onCheckedIn} />
        )}
        {mediaOpened && (
          <div hidden={active !== "media"}>
            <EventMedia />
          </div>
        )}
      </div>
    </div>
  );
}
