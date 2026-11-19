"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { PushNotifications } from "./PushNotifications";
import { Bell, X, CheckCheck, Archive } from "lucide-react";

import { adminUrl } from "@/lib/admin-url";
import { useAdminPreferences } from "./AdminPreferences";
type Notice = {
  id: string;
  title: string;
  body: string;
  url: string;
  created_at: string;
  read_at: string | null;
};
export function NotificationsBell() {
  const { t, preferences } = useAdminPreferences();
  const dialog = useRef<HTMLDialogElement>(null);
  const [notices, setNotices] = useState<Notice[]>([]),
    [unread, setUnread] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [open, setOpen] = useState(false);
  const load = useCallback(async (poll = false) => {
    try {
      const r = await fetch(
        adminUrl("/api/admin/notifications" + (poll ? "?poll=1" : "")),
        { cache: "no-store" },
      );
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setNotices(d.notices);
      setUnread(d.unread);
      setError("");
    } catch {
      setError("Notifications could not be loaded.");
    } finally {
      if (!poll) setBusy(false);
    }
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => void load());
    const changed = () => void load(true);
    window.addEventListener("admin-rhythm-read", changed);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 60000);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("admin-rhythm-read", changed);
      clearInterval(timer);
    };
  }, [load]);
  async function mark(action: "read" | "read-all" | "archive", id?: string) {
    try {
      const r = await fetch(adminUrl("/api/admin/notifications"), {
        method: "PATCH",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id }),
      });
      if (!r.ok) {
        setError("Could not update notification");
        return;
      }
      await load(true);
    } catch {
      setError("Could not update notification");
    }
  }
  return (
    <>
      <button
        type="button"
        className="admin-notification-bell"
        aria-label={
          t("Notifications") + (unread ? ` · ${unread} ${t("Unread")}` : "")
        }
        onClick={() => {
          setBusy(true);
          setOpen(true);
          dialog.current?.showModal();
          void load();
        }}
      >
        <Bell size={21} />
        {unread > 0 && <span>{unread > 99 ? "99+" : unread}</span>}
      </button>
      <dialog
        ref={dialog}
        className="admin-notification-dialog"
        onClose={() => setOpen(false)}
      >
        <header>
          <h2>{t("Notifications")}</h2>
          <button
            type="button"
            aria-label={t("Close notifications")}
            onClick={() => dialog.current?.close()}
          >
            <X size={21} />
          </button>
        </header>
        <div className="admin-notification-tools">
          <button
            type="button"
            disabled={!unread}
            onClick={() => void mark("read-all")}
          >
            <CheckCheck size={16} />
            {t("Mark all as read")}
          </button>
        </div>
        <div className="admin-notification-push">
          {open && <PushNotifications compact />}
        </div>
        <div className="admin-notification-list">
          {busy && <p role="status">{t("Loading…")}</p>}
          {error && <p role="alert">{t(error)}</p>}
          {!busy && !notices.length && !error && (
            <p>{t("No notifications yet.")}</p>
          )}
          {notices.map((n) => (
            <article key={n.id} data-unread={!n.read_at || undefined}>
              <div>
                <time>
                  {new Date(n.created_at).toLocaleString(
                    preferences.language === "zh" ? "zh-SG" : "en-SG",
                    {
                      timeZone: "Asia/Singapore",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}{" "}
                  SGT
                </time>
                <button
                  type="button"
                  aria-label={t("Dismiss notification")}
                  onClick={() => void mark("archive", n.id)}
                >
                  <Archive size={16} />
                </button>
              </div>
              <a
                href={adminUrl(
                  n.url.startsWith("/admin")
                    ? n.url
                    : "/admin" + (n.url === "/" ? "" : n.url),
                )}
                onClick={() => {
                  if (!n.read_at) void mark("read", n.id);
                  dialog.current?.close();
                }}
              >
                <h3>
                  {!n.read_at && (
                    <span className="sr-only">{t("Unread")} · </span>
                  )}
                  {n.title}{" "}
                  <span aria-hidden="true" className="notice-arrow">
                    →
                  </span>
                </h3>
                <p>{n.body}</p>
              </a>
            </article>
          ))}
        </div>
      </dialog>
    </>
  );
}
