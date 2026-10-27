import type { Metadata } from "next";
import SettingsPanel from "@/components/admin/SettingsPanel";
export const metadata: Metadata = { title: "Settings — Admin" };
import { dailyOwner } from "@/lib/daily/server";
import { SettingsTabs } from "@/components/admin/releases/SettingsTabs";
import { AdminReleaseList } from "@/components/admin/releases/AdminReleaseList";
import { AdminText } from "@/components/admin/AdminPreferences";
import { adminReleases } from "@/lib/admin-releases/data";
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await dailyOwner();
  const releases = (await searchParams).tab === "releases";
  return (
    <div>
      <SettingsTabs active={releases ? "releases" : "preferences"} />
      {releases ? (
        <section className="admin-release-archive">
          <h1>
            <AdminText text="Release notes" />
          </h1>
          <AdminReleaseList releases={adminReleases} />
        </section>
      ) : (
        <SettingsPanel />
      )}
    </div>
  );
}
