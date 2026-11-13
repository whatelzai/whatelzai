"use client";
/* eslint-disable @next/next/no-img-element -- private thumbnails are lazy-loaded through expiring signed URLs. */
import { useRef, useState } from "react";
import { Film, ImageOff } from "lucide-react";
import type { EventMediaFile } from "@/lib/event-admin/media-policy";
export default function MediaThumbnail({ file }: { file: EventMediaFile }) {
  const [url, setUrl] = useState(file.url),
    [failed, setFailed] = useState(false);
  const attempted = useRef(false);
  async function renew() {
    if (attempted.current) {
      setFailed(true);
      return;
    }
    attempted.current = true;
    try {
      const r = await fetch(
        `/api/admin/event-media?path=${encodeURIComponent(file.path)}`,
        { cache: "no-store" },
      );
      const d = await r.json();
      if (!r.ok) throw Error();
      setUrl(d.url);
    } catch {
      setFailed(true);
    }
  }
  if (failed)
    return (
      <span className="media-thumb-fallback" aria-label="Preview unavailable">
        {file.type.startsWith("video/") ? <Film /> : <ImageOff />}
      </span>
    );
  return file.type.startsWith("video/") ? (
    <video
      src={`${url}#t=0.1`}
      muted
      playsInline
      preload="metadata"
      onError={() => void renew()}
      aria-label={`Video thumbnail: ${file.title || file.name}`}
    />
  ) : (
    <img
      src={url}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => void renew()}
    />
  );
}
