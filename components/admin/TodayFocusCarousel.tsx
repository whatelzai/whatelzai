"use client";
import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Bot,
  Network,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from "lucide-react";
import type { FocusItem } from "@/lib/admin-focus/model";
import { focusPath, focusReference } from "@/lib/admin-focus/model";
import type { Task } from "@/lib/daily/model";
import { workLanes } from "@/lib/admin-week";
import { adminUrl } from "@/lib/admin-url";
import Link from "./AdminLink";
import { useAdminPreferences } from "./AdminPreferences";
const icons = {
  "ai-business": Bot,
  "network-marketing": Network,
  "day-job": BriefcaseBusiness,
  personal: CalendarDays,
  administration: CalendarDays,
};
export function TodayFocusCarousel({
  items,
  lane,
}: {
  items: FocusItem[];
  lane?: Task["lane"];
}) {
  const { t } = useAdminPreferences();
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0),
    [auto, setAuto] = useState(true),
    [hover, setHover] = useState(false);
  const total = items.length;
  const active = Math.min(index, Math.max(0, total - 1));
  const go = (n: number, manual = true) => {
    if (manual) setAuto(false);
    track.current?.scrollTo({
      left: n * (track.current?.clientWidth ?? 0),
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
    setIndex(n);
  };
  useEffect(() => {
    if (
      !auto ||
      hover ||
      total < 2 ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const el = track.current;
      if (!el) return;
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % total;
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
      setIndex(next);
    }, 6500);
    return () => clearInterval(timer);
  }, [auto, hover, total]);
  return (
    <div
      className="today-carousel"
      aria-roledescription="carousel"
      aria-label={t("Today’s focus")}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocusCapture={() => setAuto(false)}
    >
      <div
        ref={track}
        className="today-carousel-track"
        onPointerDown={() => setAuto(false)}
        onScroll={() => {
          const el = track.current;
          if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {items.map((item, n) => {
          const Icon = icons[item.lane];
          return (
            <article
              key={item.id}
              className="today-focus-card"
              data-lane={item.lane}
              aria-roledescription="slide"
              aria-label={`${n + 1} / ${total}`}
              aria-hidden={n !== active}
            >
              <Link
                href={adminUrl(focusPath(item.id, "today", lane))}
                tabIndex={n === active ? 0 : -1}
              >
                <span className="today-card-top">
                  <Icon size={26} aria-hidden="true" />
                  <small>
                    {t(
                      workLanes.find((l) => l.lane === item.lane)?.label ??
                        "Administration",
                    )}
                  </small>
                  <span>{focusReference(item.id)}</span>
                </span>
                <strong>{item.title}</strong>
                <span className="today-card-bottom">
                  <span>
                    {t(
                      item.status.startsWith("Imported event")
                        ? "Calendar"
                        : item.status,
                    )}
                  </span>
                  <ChevronRight size={20} aria-hidden="true" />
                </span>
              </Link>
            </article>
          );
        })}
      </div>
      {total > 1 && (
        <div className="today-carousel-controls">
          <button
            type="button"
            aria-label={t("Previous focus")}
            onClick={() => go((active - 1 + total) % total)}
          >
            <ChevronLeft size={16} />
          </button>
          <span aria-live={auto ? "off" : "polite"}>
            {active + 1} / {total}
          </span>
          <button
            type="button"
            aria-label={t("Next focus")}
            onClick={() => go((active + 1) % total)}
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            aria-label={t(auto ? "Pause carousel" : "Play carousel")}
            aria-pressed={auto}
            onClick={() => setAuto(!auto)}
          >
            {auto ? <Pause size={15} /> : <Play size={15} />}
          </button>
        </div>
      )}
    </div>
  );
}
