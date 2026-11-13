"use client";
import dynamic from "next/dynamic";
import MediaCollection from "./MediaCollection";
import type { EventMediaFile } from "@/lib/event-admin/media-policy";
import { List, GalleryHorizontal } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, RefreshCw, Check, CircleAlert } from "lucide-react";
import {
  EVENT_MEDIA_BUCKET,
  EVENT_MEDIA_TYPES,
  mediaInput,
} from "@/lib/event-admin/media-policy";
const MediaViewer = dynamic(() => import("./MediaViewer"), {
  loading: () => <p role="status">Opening viewer…</p>,
});
export default function EventMedia() {
  const [rows, setRows] = useState<EventMediaFile[]>([]),
    [offset, setOffset] = useState(0),
    [more, setMore] = useState(false),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [preview, setPreview] = useState<number | null>(null),
    [view, setView] = useState<"list" | "swipe">("list"),
    [revision, setRevision] = useState(0);
  const pending = useRef(false);
  const reload = useCallback(() => {
    setPreview(null);
    setRevision((v) => v + 1);
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    fetch(`/api/admin/event-media?offset=${offset}`, {
      cache: "no-store",
      signal: abort.signal,
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        return d;
      })
      .then((d) => {
        if (!abort.signal.aborted) {
          setRows(d.files);
          setMore(d.more);
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [offset, revision]);
  async function upload(files: File[]) {
    if (!files.length || pending.current) return;
    if (files.length > 20) {
      setError("Choose up to 20 files at a time.");
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    let saved = 0;
    const failures: string[] = [];
    try {
      const { supabase } = await import("@/lib/supabase-client");
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setMessage(`Uploading ${i + 1}/${files.length} · ${file.name}`);
        try {
          const input = mediaInput(file);
          const response = await fetch("/api/admin/event-media", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
            cache: "no-store",
            signal: AbortSignal.timeout(15000),
          });
          const d = await response.json();
          if (!response.ok) throw Error(d.error);
          const { error: uploadError } = await supabase.storage
            .from(EVENT_MEDIA_BUCKET)
            .uploadToSignedUrl(d.path, d.token, file, {
              contentType: input.type,
            });
          if (uploadError)
            throw Error(
              "Upload failed. Check your connection and retry this file.",
            );
          saved++;
        } catch (e) {
          failures.push(
            `${file.name}: ${e instanceof Error ? e.message : "Upload failed"}`,
          );
        }
      }
      setMessage(`${saved}/${files.length} uploaded.`);
      setError(failures.join(" · "));
      setOffset(0);
      reload();
    } catch {
      setError("Upload unavailable. Please retry.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="event-media" aria-label="Event media">
      <div className="event-media-heading">
        <label className="event-media-upload">
          <Upload size={18} />
          {busy ? "Uploading…" : "Upload"}
          <input
            aria-label="Upload event photos and videos"
            type="file"
            accept={EVENT_MEDIA_TYPES.join(",")}
            multiple
            disabled={busy}
            onChange={(e) => {
              void upload(Array.from(e.target.files || []));
              e.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          aria-label="Refresh event media"
          disabled={busy || loading}
          onClick={() => {
            setLoading(true);
            reload();
          }}
        >
          <RefreshCw size={18} />
        </button>
      </div>
      <div className="media-view-options" aria-label="Media view">
        <button
          type="button"
          aria-label="List view"
          aria-pressed={view === "list"}
          onClick={() => setView("list")}
        >
          <List size={18} />
          List
        </button>
        <button
          type="button"
          aria-label="Swipe view"
          aria-pressed={view === "swipe"}
          onClick={() => {
            setView("swipe");
          }}
        >
          <GalleryHorizontal size={18} />
          Swipe
        </button>
      </div>
      <small className="event-media-note">
        {busy
          ? "Keep this app open until uploads finish."
          : "Private · 50 MB/file"}
      </small>
      <p role="status" className="event-media-status">
        {message && (
          <>
            {busy ? <Upload size={16} /> : <Check size={16} />}
            {message}
          </>
        )}
      </p>
      {error && (
        <p role="alert" className="event-error">
          <CircleAlert size={18} />
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Loading media…</p>
      ) : !rows.length ? (
        <p className="event-media-note">No photos or videos uploaded yet.</p>
      ) : (
        <MediaCollection
          key={`${view}-${offset}`}
          files={rows}
          view={view}
          onSelect={setPreview}
        />
      )}
      {preview !== null && rows[preview] && (
        <MediaViewer
          file={rows[preview]}
          index={preview}
          total={rows.length}
          onClose={() => setPreview(null)}
          onNavigate={(direction) =>
            setPreview((i) =>
              i === null
                ? null
                : Math.max(0, Math.min(rows.length - 1, i + direction)),
            )
          }
          onSaved={(file) =>
            setRows((current) =>
              current.map((r) => (r.path === file.path ? file : r)),
            )
          }
        />
      )}
      {(offset > 0 || more) && (
        <div className="event-pagination">
          <button
            disabled={offset === 0 || busy}
            onClick={() => {
              setOffset((v) => Math.max(0, v - 25));
              setLoading(true);
              setPreview(null);
            }}
          >
            Previous
          </button>
          <button
            disabled={!more || busy}
            onClick={() => {
              setOffset((v) => v + 25);
              setLoading(true);
              setPreview(null);
            }}
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
