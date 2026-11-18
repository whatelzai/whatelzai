"use client";
import { useEffect } from "react";
import type { RhythmKind } from "@/lib/admin-rhythm/model";
import { adminUrl } from "@/lib/admin-url";
export function RhythmReadReceipt({
  kind,
  version,
}: {
  kind: RhythmKind;
  version: string;
}) {
  useEffect(() => {
    let sent = false;
    const mark = () => {
      if (sent || document.visibilityState !== "visible") return;
      sent = true;
      void fetch(adminUrl("/api/admin/rhythm"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, version }),
      })
        .then((r) => {
          if (!r.ok) {
            sent = false;
            return;
          }
          window.dispatchEvent(new Event("admin-rhythm-read"));
        })
        .catch(() => {
          sent = false;
        });
    };
    mark();
    document.addEventListener("visibilitychange", mark);
    return () => document.removeEventListener("visibilitychange", mark);
  }, [kind, version]);
  return null;
}
