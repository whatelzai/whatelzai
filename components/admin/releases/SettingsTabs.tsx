"use client";
import Link from "../AdminLink";
import { useAdminPreferences } from "../AdminPreferences";
import { adminUrl } from "@/lib/admin-url";
export function SettingsTabs({
  active,
}: {
  active: "preferences" | "releases";
}) {
  const { t } = useAdminPreferences();
  return (
    <nav className="admin-settings-tabs" aria-label={t("Settings sections")}>
      <Link
        href={adminUrl("/admin/settings")}
        aria-current={active === "preferences" ? "page" : undefined}
      >
        {t("Preferences")}
      </Link>
      <Link
        href={adminUrl("/admin/settings?tab=releases")}
        aria-current={active === "releases" ? "page" : undefined}
      >
        {t("Release notes")}
      </Link>
    </nav>
  );
}
