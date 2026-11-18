"use client";
import { FocusSettingsCard } from "@/components/admin/FocusSettings";
import { PushNotifications } from "@/components/admin/PushNotifications";
import {
  PreferenceRows,
  useAdminPreferences,
} from "@/components/admin/AdminPreferences";
import { InstallAppButton } from "@/components/fcos/AppInstallation";
import { SlidersHorizontal, Bell, Smartphone } from "lucide-react";
export default function SettingsPanel() {
  const { t, preferences } = useAdminPreferences();
  return (
    <div className="admin-workspace admin-settings-page admin-ledger compact-settings text-zinc-900">
      <h1 className="sr-only">{t("Profile")}</h1>
      <div className="admin-settings-sections">
        <section className="admin-settings-section">
          <h2>
            <SlidersHorizontal size={18} aria-hidden="true" />
            {t("Reading preferences")}
          </h2>
          <div className="admin-settings-surface">
            <PreferenceRows includeLanguage={false} />
          </div>
        </section>
        <section className="admin-settings-section">
          <h2>
            <Bell size={18} aria-hidden="true" />
            {t("Notifications & rhythm")}
          </h2>
          <div className="admin-settings-surface">
            <PushNotifications />
            <FocusSettingsCard />
          </div>
        </section>
        <section className="admin-settings-section">
          <h2>
            <Smartphone size={18} aria-hidden="true" />
            {t("App")}
          </h2>
          <div className="admin-settings-surface">
            <div className="flex flex-wrap items-center justify-between gap-4 py-5">
              <InstallAppButton language={preferences.language} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
