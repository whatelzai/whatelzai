"use client";
import type { AdminOccurrence } from "@/lib/event-admin/occurrence";
import { useId, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import {
  Image as ImageIcon,
  ScanLine,
  Images,
  MessageSquare,
} from "lucide-react";
import { currentEvent } from "@/lib/public-events/map";
import { EventScope } from "./EventScope";
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
  event = currentEvent,
  feedback,
}: {
  onCheckedIn: () => void;
  event?: AdminOccurrence;
  feedback?: ReactNode;
}) {
  const initialTool = useSearchParams().get("tool");
  const initialMedia = initialTool === "media";
  const [active, setActive] = useState<
    "poster" | "scan" | "media" | "feedback" | null
  >(initialMedia ? "media" : initialTool === "feedback" ? "feedback" : null);
  const [mediaOpened, setMediaOpened] = useState(initialMedia);
  const id = useId();
  return (
    <EventScope.Provider value={event.id}>
      <div className="event-tools">
        <div className="event-tool-tabs" aria-label="Event tools">
          <button
            type="button"
            disabled={!event.poster}
            aria-expanded={active === "poster"}
            aria-controls={id}
            onClick={() => setActive(active === "poster" ? null : "poster")}
          >
            <ImageIcon size={19} />
            Poster
          </button>
          <button
            type="button"
            disabled={event.id !== currentEvent.id}
            title={
              event.id !== currentEvent.id
                ? "Check-in is closed for this session"
                : undefined
            }
            aria-expanded={active === "scan"}
            aria-controls={id}
            onClick={() => setActive(active === "scan" ? null : "scan")}
          >
            <ScanLine size={19} />
            Scan
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
            Media
          </button>
          <button
            type="button"
            aria-expanded={active === "feedback"}
            aria-controls={id}
            onClick={() => setActive(active === "feedback" ? null : "feedback")}
          >
            <MessageSquare size={19} />
            Feedback
          </button>
        </div>
        <div id={id}>
          {active === "poster" && <PosterTools embedded event={event} />}
          {active === "scan" && (
            <Scanner autoStart autoCheckIn onCheckedIn={onCheckedIn} />
          )}
          <div hidden={active !== "feedback"}>{feedback}</div>
          {mediaOpened && (
            <div hidden={active !== "media"}>
              <EventMedia />
            </div>
          )}
        </div>
      </div>
    </EventScope.Provider>
  );
}
