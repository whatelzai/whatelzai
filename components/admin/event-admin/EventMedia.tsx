"use client";
/* eslint-disable @next/next/no-img-element -- private originals load only on explicit preview, with short-lived signed URLs. */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload,
  Image as ImageIcon,
  Film,
  RefreshCw,
  Check,
  CircleAlert,
} from "lucide-react";
import {
  EVENT_MEDIA_BUCKET,
  EVENT_MEDIA_TYPES,
  mediaInput,
} from "@/lib/event-admin/media-policy";
type FileRow = {
  path: string;
  name: string;
  size: number;
  type: string;
  url: string;
};
export default function EventMedia() {
  const [rows, setRows] = useState<FileRow[]>([]),
    [offset, setOffset] = useState(0),
    [more, setMore] = useState(false),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [preview, setPreview] = useState<FileRow | null>(null),
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
        <label className="ticket-image-button">
          <Upload size={18} />
          {busy ? "Uploading…" : "Add photos & videos"}
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
      <p className="event-media-note">
        Private · up to 50 MB per file. Keep this app open while uploading.
      </p>
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
        <div className="event-media-files">
          {rows.map((f) => (
            <button
              key={f.path}
              type="button"
              onClick={() => setPreview(preview?.path === f.path ? null : f)}
              aria-expanded={preview?.path === f.path}
            >
              {f.type.startsWith("video/") ? (
                <Film size={24} />
              ) : (
                <ImageIcon size={24} />
              )}
              <span>
                {f.name}
                <small>{(f.size / 1024 / 1024).toFixed(1)} MB</small>
              </span>
            </button>
          ))}
        </div>
      )}
      {preview && (
        <div className="event-media-preview">
          <button type="button" onClick={() => setPreview(null)}>
            Close preview
          </button>
          {preview.type.startsWith("video/") ? (
            <video
              key={preview.path}
              src={preview.url}
              controls
              playsInline
              preload="metadata"
            />
          ) : (
            <img src={preview.url} alt={preview.name} />
          )}
          <a href={preview.url} target="_blank" rel="noreferrer">
            Open original
          </a>
          <small>Preview expired? Refresh media.</small>
        </div>
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
