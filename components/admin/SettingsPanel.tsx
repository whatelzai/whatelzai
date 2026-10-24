"use client";
import { FocusSettingsCard } from "@/components/admin/FocusSettings";
import { PushNotifications } from "@/components/admin/PushNotifications";
import {
  PreferenceRows,
  useAdminPreferences,
} from "@/components/admin/AdminPreferences";
import { InstallAppButton } from "@/components/fcos/AppInstallation";
import { SignOutButton } from "@/components/auth/AuthControls";
export default function SettingsPanel() {
  const { t, preferences } = useAdminPreferences();
  return (
    <div className="admin-workspace admin-settings-page admin-ledger compact-settings text-zinc-900">
      <h1>{t("Settings")}</h1>
      <div className="admin-settings-sections">
        <section className="admin-settings-section">
          <h2>{t("Reading preferences")}</h2>
          <div className="admin-settings-surface">
            <PreferenceRows />
          </div>
        </section>
        <section className="admin-settings-section">
          <h2>{t("Notifications & rhythm")}</h2>
          <div className="admin-settings-surface">
            <PushNotifications />
            <FocusSettingsCard />
          </div>
        </section>
        <section className="admin-settings-section">
          <h2>{t("App & account")}</h2>
          <div className="admin-settings-surface">
            <div className="flex flex-wrap items-center justify-between gap-4 py-5">
              <span className="text-sm font-medium">{t("App")}</span>
              <InstallAppButton language={preferences.language} />
            </div>
            <div className="flex items-center justify-between gap-4 py-5">
              <span className="text-sm font-medium">{t("Your account")}</span>
              <SignOutButton
                redirectUrl="/sign-in"
                className="min-h-11 px-3 text-sm underline underline-offset-4"
                labels={{
                  idle: t("Sign out"),
                  busy: t("Signing out…"),
                  error: t("Could not sign out. Try again."),
                }}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
