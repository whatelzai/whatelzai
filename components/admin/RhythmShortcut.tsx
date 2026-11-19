import { Sun, Moon } from "lucide-react";
import Link from "./AdminLink";
import { AdminText } from "./AdminPreferences";
import { adminUrl } from "@/lib/admin-url";
export function RhythmShortcut({
  kind,
  status,
  loading = false,
  unread = false,
}: {
  kind: "morning" | "evening" | "weekly";
  status: string;
  loading?: boolean;
  unread?: boolean;
}) {
  const label =
    kind === "morning" ? "Morning" : kind === "evening" ? "Night" : "Weekly";
  const name =
    kind === "morning"
      ? "Morning brief"
      : kind === "evening"
        ? "Evening debrief"
        : "Weekly closeout";
  const href = `/admin/rhythm/${kind}`;
  return (
    <Link
      href={adminUrl(href)}
      className="rhythm-shortcut"
      data-rhythm={kind}
      aria-label={name + (unread ? " · Unread" : "")}
    >
      <span className="rhythm-shortcut-icon" aria-hidden="true">
        {unread && <span className="rhythm-unread-dot" />}
        {kind === "morning" ? (
          <Sun size={28} strokeWidth={1.7} />
        ) : kind === "evening" ? (
          <Moon size={28} strokeWidth={1.7} />
        ) : (
          <span className="rhythm-seven">7</span>
        )}
      </span>
      <span className="rhythm-shortcut-label">
        <AdminText text={label} />
      </span>
      {status && (
        <small role={loading ? "status" : undefined}>
          <AdminText text={status} />
        </small>
      )}
    </Link>
  );
}
