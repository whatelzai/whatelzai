"use client";
import { useRef, useState } from "react";
import { Film, ChevronLeft, ChevronRight } from "lucide-react";
import MediaThumbnail from "./MediaThumbnail";
import type { EventMediaFile } from "@/lib/event-admin/media-policy";
export default function MediaCollection({
  files,
  view,
  onSelect,
}: {
  files: EventMediaFile[];
  view: "list" | "swipe";
  onSelect: (index: number) => void;
}) {
  const [slide, setSlide] = useState(0);
  const carousel = useRef<HTMLDivElement>(null);
  return view === "list" ? (
    <div className="media-file-list">
      {files.map((f, i) => (
        <button
          type="button"
          key={f.path}
          onClick={() => onSelect(i)}
          aria-label={`View ${f.title || f.name}`}
        >
          <span className="media-list-thumb">
            <MediaThumbnail key={f.path + f.url} file={f} />
            {f.type.startsWith("video/") && (
              <Film className="media-video-mark" size={16} />
            )}
          </span>
          <span className="media-list-copy">
            <strong>{f.title || f.name}</strong>
            <span>
              {f.description ||
                `${f.type.startsWith("video/") ? "Video" : "Photo"} · ${(f.size / 1024 / 1024).toFixed(1)} MB`}
            </span>
          </span>
        </button>
      ))}
    </div>
  ) : (
    <div className="media-swipe">
      <div
        className="media-swipe-track"
        ref={carousel}
        onScroll={(e) => {
          const width = e.currentTarget.clientWidth;
          if (width > 0)
            setSlide(
              Math.max(
                0,
                Math.min(
                  files.length - 1,
                  Math.round(e.currentTarget.scrollLeft / width),
                ),
              ),
            );
        }}
      >
        {files.map((f, i) => (
          <button
            type="button"
            className="media-swipe-slide"
            key={f.path}
            onClick={() => onSelect(i)}
            aria-label={`View ${f.title || f.name}`}
          >
            <MediaThumbnail key={f.path + f.url} file={f} />
            <span>{f.title || f.name}</span>
          </button>
        ))}
      </div>
      <div className="media-viewer-navigation">
        <button
          type="button"
          aria-label="Previous slide"
          disabled={slide === 0}
          onClick={() =>
            carousel.current?.scrollTo({
              left: (slide - 1) * carousel.current.clientWidth,
              behavior: "smooth",
            })
          }
        >
          <ChevronLeft />
        </button>
        <span>
          {slide + 1} / {files.length}
        </span>
        <button
          type="button"
          aria-label="Next slide"
          disabled={slide >= files.length - 1}
          onClick={() =>
            carousel.current?.scrollTo({
              left: (slide + 1) * carousel.current.clientWidth,
              behavior: "smooth",
            })
          }
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  );
}
