"use client";
import { useEffect, useRef } from "react";
import Link from "../AdminLink";
import { useAdminPreferences } from "../AdminPreferences";
import { adminUrl } from "@/lib/admin-url";
import type { AdminRelease } from "@/lib/admin-releases/model";
import { AdminReleaseList } from "./AdminReleaseList";
export default function AdminReleasePopup({
  releases,
  onDismiss,
}: {
  releases: AdminRelease[];
  onDismiss: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { t } = useAdminPreferences();
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const overflow = document.body.style.overflow;
    el.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      el.close();
      document.body.style.overflow = overflow;
    };
  }, []);
  function close() {
    dialog.current?.close();
    onDismiss();
  }
  return (
    <dialog
      ref={dialog}
      className="admin-release-dialog"
      aria-labelledby="admin-release-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <header>
        <div>
          <p>Whatelz Admin</p>
          <h2 id="admin-release-title">{t("What’s new")}</h2>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label={t("Close release notes")}
        >
          {t("Close")}
        </button>
      </header>
      <div
        className="admin-release-scroll"
        tabIndex={0}
        role="region"
        aria-label={t("Latest three releases")}
      >
        <AdminReleaseList releases={releases} />
      </div>
      <footer>
        <Link href={adminUrl("/admin/settings?tab=releases")} onClick={close}>
          {t("View all release notes")} <span aria-hidden="true">›</span>
        </Link>
      </footer>
    </dialog>
  );
}
