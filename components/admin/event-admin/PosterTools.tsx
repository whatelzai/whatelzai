"use client";
/* eslint-disable @next/next/no-img-element -- this is the original downloadable PNG, not an optimised derivative. */
import { useEffect, useState } from "react";
import {
  Download,
  Share2,
  Copy,
  Image as ImageIcon,
  RefreshCw,
} from "lucide-react";
import { mapEvent } from "@/lib/public-events/map";
import {
  canSharePoster,
  eventCaption,
  eventUrl,
  posterFilename,
  sharePoster,
} from "@/lib/event-admin/sharing";
export default function PosterTools({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const Container = embedded ? "section" : "details";
  const [open, setOpen] = useState(embedded),
    [file, setFile] = useState<File | null>(null),
    [shareable, setShareable] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [caption, setCaption] = useState(eventCaption);
  useEffect(() => {
    if (!open || file) return;
    const abort = new AbortController();
    fetch(mapEvent.poster, { signal: abort.signal })
      .then(async (r) => {
        if (!r.ok) throw Error("Poster unavailable. Try again.");
        const blob = await r.blob();
        if (blob.type !== "image/png" || blob.size > 15 * 1024 * 1024)
          throw Error("Poster format unavailable.");
        return new File([blob], posterFilename, { type: "image/png" });
      })
      .then((f) => {
        if (abort.signal.aborted) return;
        setFile(f);
        setShareable(canSharePoster(navigator, f));
        setError("");
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [open, file, retry]);
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
          Poster & share
        </summary>
      )}
      {open && (
        <div className="event-poster-body">
          <a
            href={mapEvent.poster}
            target="_blank"
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
            <a
              href={mapEvent.poster}
              download={posterFilename}
              className="event-poster-download"
            >
              <Download size={17} />
              Download image
            </a>
            {!file && !error && <span role="status">Preparing share…</span>}
            {shareable && file && (
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  setMessage("");
                  try {
                    const result = await sharePoster(navigator, file);
                    if (result === "opened")
                      setMessage(
                        "Share sheet opened. Finish editing and posting in your chosen app.",
                      );
                  } catch {
                    setError(
                      "Sharing unavailable. Download the poster and upload it in your app.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Share2 size={17} />
                {busy ? "Sharing…" : "Share image"}
              </button>
            )}
            {file && !shareable && (
              <p>
                Download the poster, then add it in Instagram, LinkedIn or
                Xiaohongshu.
              </p>
            )}
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
            {error && (
              <p role="alert">
                {error}{" "}
                {!file && (
                  <button type="button" onClick={() => setRetry((v) => v + 1)}>
                    <RefreshCw size={14} />
                    Retry
                  </button>
                )}
              </p>
            )}
          </div>
        </div>
      )}
    </Container>
  );
}
