import type { Metadata } from "next";
import { ensureUserRow } from "@/lib/users";
import { AdminProfileIdentity } from "@/components/admin/AdminProfileIdentity";
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
  const user = await ensureUserRow();
  const releases = (await searchParams).tab === "releases";
  return (
    <div className="admin-profile-page">
      {!releases && user && (
        <AdminProfileIdentity
          name={user.name}
          email={user.email}
          image={user.image_url}
        />
      )}
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
