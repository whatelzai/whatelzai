"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  testimonialSlug,
  CATEGORY_LABELS,
  type Testimonial,
} from "@/lib/testimonials";
import { Stars } from "./stars";
import { AvatarFallback } from "./avatar-fallback";

function formatAffiliations(t: Testimonial): string[] {
  return (t.author_affiliations ?? [])
    .map((a) => [a.role, a.company].filter(Boolean).join(", "))
    .filter(Boolean);
}

function Card({ t }: { t: Testimonial }) {
  const affiliations = formatAffiliations(t);
  const href = `/testimonials/${testimonialSlug(t)}`;

  return (
    <article
      className="group relative flex w-[340px] shrink-0 flex-col gap-5 border border-zinc-200 bg-white p-6 transition-all sm:w-[420px] sm:p-8"
      style={{ borderLeft: "3px solid var(--accent)" }}
    >
      <Link
        href={href}
        aria-label={`Read ${t.author_name}'s full testimonial`}
        className="absolute inset-0 z-10"
      >
        <span className="sr-only">
          Read {t.author_name}&rsquo;s testimonial
        </span>
      </Link>

      <Stars />

      {t.headline && (
        <h3 className="text-lg leading-snug font-semibold text-zinc-900 sm:text-xl">
          {t.headline}
        </h3>
      )}

      <p className="line-clamp-5 text-sm leading-relaxed text-zinc-600 sm:text-base">
        &ldquo;{t.quote}&rdquo;
      </p>

      {t.outcome_tag && (
        <p
          className="font-mono text-xs tracking-wide"
          style={{ color: "var(--accent-text)" }}
        >
          {t.outcome_tag}
        </p>
      )}

      <div className="mt-auto flex items-center gap-4 border-t border-zinc-100 pt-5">
        {t.author_avatar_url ? (
          <Image
            src={t.author_avatar_url}
            alt={t.author_name}
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-full object-cover"
          />
        ) : (
          <AvatarFallback
            className="h-11 w-11"
            ariaLabel={`${t.author_name} avatar placeholder`}
          />
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900">{t.author_name}</p>
          {affiliations.map((a) => (
            <p key={a} className="truncate font-mono text-xs text-zinc-500">
              {a}
            </p>
          ))}
        </div>
        <span
          className="public-yellow-surface ml-auto shrink-0 self-start px-2 py-0.5 font-mono text-[10px] tracking-widest text-zinc-900 uppercase"
          style={{ backgroundColor: "var(--accent)" }}
        >
          {CATEGORY_LABELS[t.category]}
        </span>
      </div>
    </article>
  );
}

// Marquee driven by scrollLeft on the container (not CSS translate) so the
// browser's native horizontal scroll — trackpad two-finger swipe, drag on the
// scrollbar, arrow keys — composes cleanly with the auto-advance. The track
// duplicates the list; when scrollLeft crosses the seam we subtract half the
// scroll width for a seamless loop.
//
// Auto-scroll pauses on: hover, mousedown/touch, a recent wheel event
// (so user's two-finger scroll actually feels like scrolling, not fighting
// the animation), reduced-motion preference, or the tab being backgrounded.
export function TestimonialsMarquee({ items }: { items: Testimonial[] }) {
  const outerRef = useRef<HTMLDivElement>(null);
  // Only duplicate the track when there are enough voices for a real loop.
  // With 1-2 items the "duplicated seam" renders as visible duplicate cards.
  const shouldLoop = items.length >= 3;
  const track = shouldLoop ? [...items, ...items] : items;

  useEffect(() => {
    // No loop = no rAF auto-advance needed.
    if (!shouldLoop) return;
    const el = outerRef.current;
    if (!el) return;

    // Respect reduced-motion — no auto-scroll, user still gets manual scroll.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;

    // Speed roughly matches the previous 45s-per-loop feel. Tuned to px/sec.
    const PX_PER_SEC = 30;
    const WHEEL_COOLDOWN_MS = 700;

    let raf = 0;
    let lastTs = performance.now();
    let paused = false;
    let lastWheelAt = 0;

    const isHovered = () => el.matches(":hover");
    const halfWidth = () => el.scrollWidth / 2;

    const tick = (now: number) => {
      const dt = Math.min(now - lastTs, 100); // clamp long frames
      lastTs = now;

      const wheelRecent = now - lastWheelAt < WHEEL_COOLDOWN_MS;
      const shouldAdvance =
        !paused && !isHovered() && !wheelRecent && !document.hidden;

      if (shouldAdvance) {
        el.scrollLeft += (PX_PER_SEC * dt) / 1000;
      }

      // Seamless loop: track is duplicated, so subtract halfWidth at the seam.
      const half = halfWidth();
      if (half > 0 && el.scrollLeft >= half) {
        el.scrollLeft -= half;
      } else if (el.scrollLeft < 0) {
        el.scrollLeft += half;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    const onPointerDown = () => {
      paused = true;
    };
    const onPointerUp = () => {
      paused = false;
    };
    const onWheel = () => {
      // Any wheel event (including horizontal deltaX from trackpad) counts.
      lastWheelAt = performance.now();
    };
    const onVisibility = () => {
      // Reset the timer so the marquee doesn't fast-forward on tab-return.
      lastTs = performance.now();
    };

    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    el.addEventListener("wheel", onWheel, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("wheel", onWheel);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [shouldLoop]);

  return (
    <div
      ref={outerRef}
      className="marquee-outer relative mt-14 overflow-x-auto overflow-y-hidden"
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        scrollbarWidth: "none",
      }}
    >
      <div className="flex w-max gap-6 px-6">
        {track.map((t, i) => (
          <Card key={`${t.id}-${i}`} t={t} />
        ))}
      </div>

      <style>{`
        .marquee-outer::-webkit-scrollbar { display: none; }
        /* Momentum scrolling on iOS. No scroll-snap: it fights the rAF
           auto-advance (browser snaps back to current card every frame,
           making the marquee appear frozen). Finger swipe still works
           via native overflow-x-auto — just without snap points. */
        .marquee-outer { -webkit-overflow-scrolling: touch; }
      `}</style>
    </div>
  );
}
