"use client";
import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { RhythmShortcut } from "./RhythmShortcut";
import Link from "./AdminLink";
import { useAdminPreferences } from "./AdminPreferences";
import { adminUrl } from "@/lib/admin-url";
import { rhythmKinds, type RhythmSnapshot } from "@/lib/admin-rhythm/model";
export type RhythmSummary = Pick<
  RhythmSnapshot,
  "kind" | "entry_key" | "version" | "read_version"
>;
export function RhythmRail({ initial }: { initial: RhythmSummary[] }) {
  const { t } = useAdminPreferences(),
    [items, setItems] = useState(initial);
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch(adminUrl("/api/admin/rhythm"), {
          cache: "no-store",
        });
        if (r.ok) {
          const d = await r.json();
          if (active) setItems(d.snapshots);
        }
      } catch {
        /* Keep the latest confirmed snapshot. */
      }
    };
    const frame = requestAnimationFrame(() => void load());
    const timer = setInterval(() => void load(), 60000);
    const changed = () => void load();
    window.addEventListener("admin-rhythm-read", changed);
    document.addEventListener("visibilitychange", changed);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      clearInterval(timer);
      window.removeEventListener("admin-rhythm-read", changed);
      document.removeEventListener("visibilitychange", changed);
    };
  }, []);
  return (
    <div className="routine-rail rhythm-four">
      {rhythmKinds.map((kind) => {
        const entry = items.find((i) => i.kind === kind);
        return (
          <RhythmShortcut
            key={kind}
            kind={kind}
            status={entry?.entry_key ?? ""}
            unread={!!entry && entry.version !== entry.read_version}
          />
        );
      })}
      <Link
        href={adminUrl("/admin/calendar")}
        className="rhythm-shortcut"
        data-rhythm="calendar"
      >
        <span className="rhythm-shortcut-icon" aria-hidden="true">
          <CalendarDays size={28} strokeWidth={1.7} />
        </span>
        <span className="rhythm-shortcut-label">{t("Calendar")}</span>
      </Link>
    </div>
  );
}
