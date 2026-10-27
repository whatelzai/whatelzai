"use client";
import { useEffect, useRef } from "react";
import Link from "@/components/fcos/MemberLink";
import { X } from "lucide-react";
import { dismissRelease } from "@/app/member-home/release-actions";
import type { ReleaseNote } from "@/lib/releases/model";
import { ReleaseList } from "./ReleaseList";

export function ReleasePopup({ releases }: { releases: ReleaseNote[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const dismissed = useRef(false);
  const previousOverflow = useRef("");
  useEffect(() => {
    const element = dialog.current;
    if (!element || element.open || dismissed.current) return;
    // Native modal focus handling, Escape and an inert background.
    previousOverflow.current = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow.current;
      element.close();
    };
  }, []);
  const close = () => {
    if (dismissed.current) return;
    dismissed.current = true;
    dialog.current?.close();
    document.body.style.overflow = previousOverflow.current;
    // Closing never waits for the network. The acknowledgement belongs only
    // to the verified server-side account; failures leave it unseen next visit.
    void dismissRelease(releases[0].id).catch(() => undefined);
  };
  return (
    <dialog
      ref={dialog}
      aria-labelledby="release-popup-title"
      className="fixed inset-0 m-auto h-[min(80dvh,640px)] max-h-[calc(100dvh-32px)] w-[calc(100%_-_32px)] max-w-lg overflow-hidden rounded-3xl border-0 bg-white p-0 text-zinc-950 shadow-2xl backdrop:bg-zinc-950/30"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-zinc-100 px-5 py-4">
          <div>
            <p className="text-xs font-medium text-zinc-500">fcOS updates</p>
            <h2 id="release-popup-title" className="mt-1 text-xl font-semibold">
              What’s new
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close release notes"
            onClick={close}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 focus-visible:outline-2 focus-visible:outline-yellow-500"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div
          tabIndex={0}
          aria-label="Latest three releases"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-yellow-500"
        >
          <ReleaseList releases={releases} />
        </div>
        <footer className="shrink-0 border-t border-zinc-100 px-5 py-3">
          <Link
            href="/profile?tab=releases"
            onClick={close}
            className="flex min-h-11 items-center justify-center rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white"
          >
            View all release notes
          </Link>
        </footer>
      </div>
    </dialog>
  );
}
