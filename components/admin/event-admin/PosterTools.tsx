"use client";
/* eslint-disable @next/next/no-img-element -- this is the original downloadable PNG, not an optimised derivative. */
import { useState } from "react";
import { Copy, Image as ImageIcon } from "lucide-react";
import { mapEvent } from "@/lib/public-events/map";
import {
  eventCaption,
  eventUrl,
  posterFilename,
} from "@/lib/event-admin/sharing";
import SocialImageExport from "./SocialImageExport";
export default function PosterTools({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const Container = embedded ? "section" : "details";
  const [open, setOpen] = useState(embedded),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [caption, setCaption] = useState(eventCaption);
  async function copy(text: string, label: string) {
    setMessage("");
    try {
      await navigator.clipboard.writeText(text);
      setMessage(label + " copied.");
      setError("");
    } catch {
      setError("Copy unavailable here. Select and copy the text below.");
    }
  }
  return (
    <Container
      className="event-poster-tools"
      onToggle={
        embedded
          ? undefined
          : (e) => setOpen((e.currentTarget as HTMLDetailsElement).open)
      }
    >
      {!embedded && (
        <summary>
          <ImageIcon size={17} />
          Poster
        </summary>
      )}
      {open && (
        <div className="event-poster-body">
          <a
            href={mapEvent.poster}
            rel="noreferrer"
            className="event-poster-preview"
            aria-label="Open full-size event poster"
          >
            <img
              src={mapEvent.poster}
              alt={`${mapEvent.title} — ${mapEvent.dateLabel}`}
              loading="lazy"
            />
          </a>
          <div className="event-poster-actions">
            <SocialImageExport
              source={mapEvent.poster}
              filename={posterFilename}
            />
            <button type="button" onClick={() => void copy(caption, "Caption")}>
              <Copy size={16} />
              Copy caption
            </button>
            <button
              type="button"
              onClick={() => void copy(eventUrl, "Event link")}
            >
              <Copy size={16} />
              Copy event link
            </button>
            <label>
              Caption
              <textarea
                aria-label="Event caption"
                rows={7}
                maxLength={4000}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </label>
            <label>
              Event link
              <input
                aria-label="Public event link"
                readOnly
                value={eventUrl}
                onFocus={(e) => e.currentTarget.select()}
              />
            </label>
            <small>
              Your phone chooses available share apps. Story/feed options and
              caption support depend on the receiving app. Nothing posts
              automatically.
            </small>
            {message && <p role="status">{message}</p>}
            {error && <p role="alert">{error} </p>}
          </div>
        </div>
      )}
    </Container>
  );
}
