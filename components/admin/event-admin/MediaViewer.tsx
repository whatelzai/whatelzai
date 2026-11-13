"use client";
/* eslint-disable @next/next/no-img-element -- signed private original, rendered directly for zoom and pan. */
import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CircleAlert,
} from "lucide-react";
import type { EventMediaFile } from "@/lib/event-admin/media-policy";
import {
  boundTransform,
  type ImageTransform,
} from "@/lib/event-admin/media-geometry";
import MediaDetails from "./MediaDetails";
import SocialImageExport from "./SocialImageExport";
function ZoomPhoto({
  url,
  name,
  onSwipe,
  onError,
}: {
  url: string;
  name: string;
  onSwipe: (direction: number) => void;
  onError: () => void;
}) {
  const stage = useRef<HTMLDivElement>(null),
    pointers = useRef(new Map<number, { x: number; y: number }>()),
    gesture = useRef({ x: 0, y: 0, distance: 0, t: { scale: 1, x: 0, y: 0 } }),
    natural = useRef({ width: 0, height: 0 });
  const [transform, setTransform] = useState<ImageTransform>({
    scale: 1,
    x: 0,
    y: 0,
  });
  function bounded(t: ImageTransform) {
    return boundTransform(
      t,
      stage.current?.clientWidth || 1,
      stage.current?.clientHeight || 1,
      natural.current.width,
      natural.current.height,
    );
  }
  function zoom(factor: number) {
    setTransform((t) => bounded({ ...t, scale: t.scale * factor }));
  }
  function begin() {
    const p = [...pointers.current.values()];
    if (!p.length) return;
    gesture.current = {
      x: p.reduce((s, v) => s + v.x, 0) / p.length,
      y: p.reduce((s, v) => s + v.y, 0) / p.length,
      distance:
        p.length === 2 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0,
      t: transform,
    };
  }
  const wheel = useEffectEvent((e: WheelEvent) => {
    e.preventDefault();
    zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12);
  });
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const listener = (e: WheelEvent) => wheel(e);
    el.addEventListener("wheel", listener, { passive: false });
    return () => el.removeEventListener("wheel", listener);
  }, []);
  return (
    <>
      <div className="media-zoom-controls">
        <button
          type="button"
          aria-label="Zoom out"
          disabled={transform.scale <= 1}
          onClick={() => zoom(1 / 1.3)}
        >
          <ZoomOut size={20} />
        </button>
        <span>{Math.round(transform.scale * 100)}%</span>
        <button
          type="button"
          aria-label="Zoom in"
          disabled={transform.scale >= 5}
          onClick={() => zoom(1.3)}
        >
          <ZoomIn size={20} />
        </button>
        <button
          type="button"
          aria-label="Reset image"
          onClick={() => setTransform({ scale: 1, x: 0, y: 0 })}
        >
          <RotateCcw size={18} />
        </button>
      </div>
      <div
        className="media-zoom-stage"
        ref={stage}
        style={{ cursor: transform.scale > 1 ? "grab" : "default" }}
        onDoubleClick={() =>
          setTransform((t) =>
            bounded({ scale: t.scale > 1 ? 1 : 2, x: 0, y: 0 }),
          )
        }
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          begin();
        }}
        onPointerMove={(e) => {
          if (!pointers.current.has(e.pointerId)) return;
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          const p = [...pointers.current.values()];
          const g = gesture.current;
          if (p.length === 2 && g.distance) {
            const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
            setTransform(
              bounded({
                scale: (g.t.scale * d) / g.distance,
                x: g.t.x + (p[0].x + p[1].x) / 2 - g.x,
                y: g.t.y + (p[0].y + p[1].y) / 2 - g.y,
              }),
            );
          } else if (p.length === 1 && g.t.scale > 1)
            setTransform(
              bounded({
                ...g.t,
                x: g.t.x + p[0].x - g.x,
                y: g.t.y + p[0].y - g.y,
              }),
            );
        }}
        onPointerUp={(e) => {
          const g = gesture.current;
          if (
            pointers.current.size === 1 &&
            g.t.scale === 1 &&
            Math.abs(e.clientX - g.x) > 60 &&
            Math.abs(e.clientY - g.y) < 60
          )
            onSwipe(e.clientX < g.x ? 1 : -1);
          pointers.current.delete(e.pointerId);
          begin();
        }}
        onPointerCancel={() => pointers.current.clear()}
      >
        <img
          src={url}
          alt={name}
          draggable={false}
          onLoad={(e) => {
            natural.current = {
              width: e.currentTarget.naturalWidth,
              height: e.currentTarget.naturalHeight,
            };
          }}
          onError={onError}
          style={{
            transform: `translate(${transform.x}px,${transform.y}px) scale(${transform.scale})`,
          }}
        />
      </div>
    </>
  );
}
export default function MediaViewer({
  file,
  index,
  total,
  onClose,
  onNavigate,
  onSaved,
  resolveUrl,
}: {
  file: EventMediaFile;
  index: number;
  total: number;
  onClose: () => void;
  onNavigate: (direction: number) => void;
  onSaved: (file: EventMediaFile) => void;
  resolveUrl?: (path: string) => Promise<string>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const el = dialog.current;
    const previousFocus = document.activeElement;
    el?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      el?.close();
      document.body.style.overflow = previous;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus();
    };
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    const request = resolveUrl
      ? resolveUrl(file.path)
      : fetch(`/api/admin/event-media?path=${encodeURIComponent(file.path)}`, {
          cache: "no-store",
          signal: abort.signal,
        }).then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw Error(d.error);
          return d.url;
        });
    request
      .then((u) => {
        if (!abort.signal.aborted) setUrl(u);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [file.path, retry, resolveUrl]);
  function move(n: number) {
    setUrl("");
    setError("");
    onNavigate(n);
  }
  return (
    <dialog
      ref={dialog}
      className="event-media-dialog"
      aria-labelledby="media-viewer-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        )
          return;
        if (e.key === "ArrowRight" && index < total - 1) {
          e.preventDefault();
          move(1);
        }
        if (e.key === "ArrowLeft" && index > 0) {
          e.preventDefault();
          move(-1);
        }
      }}
    >
      <header>
        <h2 id="media-viewer-title">{file.title || file.name}</h2>
        <button type="button" aria-label="Close media" onClick={onClose}>
          <X size={22} />
        </button>
      </header>
      <div className="media-viewer-navigation">
        <button
          type="button"
          aria-label="Previous media"
          disabled={index === 0}
          onClick={() => move(-1)}
        >
          <ChevronLeft />
        </button>
        <span>
          {index + 1} / {total}
        </span>
        <button
          type="button"
          aria-label="Next media"
          disabled={index >= total - 1}
          onClick={() => move(1)}
        >
          <ChevronRight />
        </button>
      </div>
      {error ? (
        <div className="media-viewer-error" role="alert">
          <CircleAlert />
          {error}
          <button
            type="button"
            onClick={() => {
              setError("");
              setUrl("");
              setRetry((n) => n + 1);
            }}
          >
            Retry preview
          </button>
        </div>
      ) : !url ? (
        <p role="status">Opening media…</p>
      ) : file.type.startsWith("video/") ? (
        <video
          key={url}
          className="media-full-video"
          src={url}
          controls
          playsInline
          preload="metadata"
          onError={() =>
            setError(
              "This browser cannot play this video. Try the original file.",
            )
          }
        />
      ) : (
        <ZoomPhoto
          key={file.path + url}
          url={url}
          name={file.title || file.name}
          onSwipe={(direction) => {
            if (index + direction >= 0 && index + direction < total)
              move(direction);
          }}
          onError={() =>
            setError(
              "This browser cannot preview this image. Try the original file.",
            )
          }
        />
      )}
      {url && (
        <a className="media-original-link" href={url} rel="noreferrer">
          Open original
        </a>
      )}
      <MediaDetails key={file.path} file={file} onSaved={onSaved} />
      {url && file.type.startsWith("image/") && (
        <details className="media-details">
          <summary>Export for social</summary>
          <SocialImageExport
            key={file.path + url}
            source={url}
            filename={file.name}
          />
        </details>
      )}
    </dialog>
  );
}
