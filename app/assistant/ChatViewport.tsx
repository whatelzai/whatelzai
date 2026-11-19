"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { keyboardIsOpen } from "@/lib/fcos/chat-viewport";

export function ChatViewport({ children }: { children: ReactNode }) {
  const page = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = page.current;
    if (!element) return;
    const viewport = window.visualViewport;
    const mobile = window.matchMedia("(max-width: 767px)");
    let baseline = viewport?.height ?? window.innerHeight;
    let frame = 0;
    let previouslyOpen = false;
    function update() {
      if (!element) return;
      if (!mobile.matches) {
        element.removeAttribute("data-keyboard-open");
        element.style.removeProperty("--fcos-viewport-height");
        element.style.removeProperty("--fcos-viewport-top");
        previouslyOpen = false;
        baseline = viewport?.height ?? window.innerHeight;
        return;
      }
      const height = viewport?.height ?? window.innerHeight;
      const focused =
        document.activeElement?.matches(
          "textarea, input, [contenteditable='true']",
        ) ?? false;
      // Retain the pre-keyboard height while focus is in the composer. Android
      // may shrink both innerHeight and visualViewport at the same time.
      if (!focused) baseline = Math.max(baseline, height);
      const keyboard = keyboardIsOpen({
        focused,
        baseline,
        height,
        scale: viewport?.scale,
        previouslyOpen,
      });
      previouslyOpen = keyboard;
      element.dataset.keyboardOpen = String(keyboard || (!viewport && focused));
      // Preserve normal browser pinch zoom; only follow the visual viewport at 1x.
      if (!viewport || Math.abs(viewport.scale - 1) < 0.05) {
        element.style.setProperty("--fcos-viewport-height", `${height}px`);
        element.style.setProperty(
          "--fcos-viewport-top",
          `${viewport?.offsetTop ?? 0}px`,
        );
      }
    }
    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    }
    function orientation() {
      baseline = window.innerHeight;
      schedule();
    }
    update();
    viewport?.addEventListener("resize", schedule);
    viewport?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", orientation);
    document.addEventListener("focusin", schedule);
    document.addEventListener("focusout", schedule);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", schedule);
      viewport?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", orientation);
      document.removeEventListener("focusin", schedule);
      document.removeEventListener("focusout", schedule);
    };
  }, []);
  return (
    <main
      ref={page}
      className="fcos-chat-page mx-auto flex h-dvh max-w-5xl flex-col overflow-hidden px-3 text-zinc-900 md:px-6"
    >
      {children}
    </main>
  );
}
