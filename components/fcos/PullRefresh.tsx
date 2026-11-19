"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, RotateCw } from "lucide-react";
import { pullDistance, refreshThreshold } from "@/lib/fcos/pull-refresh";
export function PullRefresh({
  chat = false,
  scope = "member",
}: {
  chat?: boolean;
  scope?: "member" | "admin";
}) {
  const router = useRouter();
  const [distance, setDistance] = useState(0);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const mobile = window.matchMedia("(max-width:767px)");
    const standalone =
      window.matchMedia("(display-mode:standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    // Ordinary document pages retain the browser's own pull-to-refresh.
    if (!standalone && !chat) return;
    let gesture: { x: number; y: number; scroller: Element | null } | null =
      null;
    const top = (scroller: Element | null) =>
      (scroller?.scrollTop ?? window.scrollY) <= 0;
    const busy = () =>
      pending ||
      document.querySelector('[aria-busy="true"]') !== null ||
      (chat &&
        Boolean(
          document
            .querySelector<HTMLTextAreaElement>("#member-message")
            ?.value.trim(),
        ));
    let pulled = 0;
    const start = (event: TouchEvent) => {
      gesture = null;
      pulled = 0;
      setDistance(0);
      if (
        !mobile.matches ||
        event.touches.length !== 1 ||
        busy() ||
        document.querySelector("dialog[open]") ||
        window.getSelection()?.isCollapsed === false
      )
        return;
      if (
        document.activeElement?.matches(
          'input,textarea,select,[contenteditable="true"]',
        )
      )
        return;
      const target = event.target instanceof Element ? event.target : null;
      if (
        !target ||
        target.closest(
          'input,textarea,select,button,[contenteditable="true"],[data-fcos-header],[data-fcos-nav],.admin-nav-header,.admin-back-row,[data-ledger-dock]',
        )
      )
        return;
      const root = target.closest(
        scope === "admin" ? "#admin-main" : ".fcos-tab-page,.fcos-chat-page",
      );
      if (!root) return;
      // Nested media, tables and dialogs keep their own scroll gestures.
      if (scope === "admin") {
        for (
          let el: Element | null = target;
          el && el !== root;
          el = el.parentElement
        ) {
          if (
            el.scrollHeight > el.clientHeight &&
            /auto|scroll/.test(getComputedStyle(el).overflowY)
          )
            return;
        }
      }
      const scroller = chat
        ? root.querySelector("[data-fcos-scroll]")
        : document.scrollingElement;
      if ((chat && !scroller) || !top(scroller)) return;
      gesture = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
        scroller,
      };
    };
    const move = (event: TouchEvent) => {
      if (!gesture) return;
      const point = event.touches[0];
      const value = pullDistance({
        dx: (point?.clientX ?? gesture.x) - gesture.x,
        dy: (point?.clientY ?? gesture.y) - gesture.y,
        atTop: top(gesture.scroller),
        touches: event.touches.length,
        busy: busy(),
        scale: window.visualViewport?.scale,
      });
      if (value === null) {
        gesture = null;
        pulled = 0;
        setDistance(0);
        return;
      }
      if (value < 10) {
        pulled = value;
        setDistance(0);
        return;
      }
      if (!event.cancelable) {
        gesture = null;
        pulled = 0;
        setDistance(0);
        return;
      }
      event.preventDefault();
      pulled = value;
      setDistance(value);
    };
    const cancel = () => {
      gesture = null;
      pulled = 0;
      setDistance(0);
    };
    const end = (event: TouchEvent) => {
      const ready =
        gesture !== null &&
        event.touches.length === 0 &&
        pulled >= refreshThreshold &&
        !busy() &&
        !document.querySelector("dialog[open]");
      cancel();
      if (ready) startTransition(() => router.refresh());
    };
    document.addEventListener("touchstart", start, { passive: true });
    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", end);
    document.addEventListener("touchcancel", cancel);
    return () => {
      document.removeEventListener("touchstart", start);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", end);
      document.removeEventListener("touchcancel", cancel);
    };
  }, [chat, pending, router, scope]);
  if (!pending && distance < 10) return null;
  return (
    <div
      role="status"
      className="fcos-refresh-indicator fixed left-1/2 z-[55] flex -translate-x-1/2 items-center gap-2 rounded-full border border-zinc-100 bg-white px-4 py-2 text-xs text-zinc-600 shadow-md"
      style={{
        top: `calc(70px + env(safe-area-inset-top,0px) + ${Math.min(distance * 0.3, 32)}px)`,
      }}
    >
      {pending ? (
        <RotateCw
          size={16}
          className="motion-safe:animate-spin"
          aria-hidden="true"
        />
      ) : (
        <ArrowDown
          size={16}
          className={distance >= refreshThreshold ? "rotate-180" : ""}
          aria-hidden="true"
        />
      )}
      {pending
        ? "Refreshing…"
        : distance >= refreshThreshold
          ? "Release to refresh"
          : "Pull to refresh"}
    </div>
  );
}
