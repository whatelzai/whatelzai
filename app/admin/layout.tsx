import { weosAccess } from "@/lib/weos-role-server";
import { SignOutButton } from "@/components/auth/AuthControls";
import "@/components/admin/event-admin/events.css";
import { AdminPreferencesProvider } from "@/components/admin/AdminPreferences";
import { AdminFocusProvider } from "@/components/admin/AdminFocus";
import "./admin.css";
import { AdminAppBoundary } from "@/components/admin/AdminAppBoundary";
import { AdminWorkspaceTheme } from "@/components/admin/AdminWorkspaceTheme";
import "@/components/admin/releases/releases.css";
import AdminReleaseNotice from "@/components/admin/releases/AdminReleaseNotice";
import { adminReleases } from "@/lib/admin-releases/data";
import { isOwnerUser } from "@/lib/admin-policy";
import { notFound } from "next/navigation";
import { ensureUserRow } from "@/lib/users";
import { PullRefresh } from "@/components/fcos/PullRefresh";
import { AdminNavigation } from "@/components/admin/AdminNavigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await ensureUserRow();
  if (!user) notFound();
  if (!isOwnerUser(user)) {
    const access = await weosAccess();
    if (access.actual !== "blaze") notFound();
    return (
      <div className="min-h-dvh bg-white text-zinc-950">
        <header className="flex min-h-16 items-center justify-between border-b border-zinc-200 px-5">
          <a href="/community" className="font-semibold">
            weOS · Community
          </a>
          <SignOutButton />
        </header>
        {children}
      </div>
    );
  }

  return (
    <AdminPreferencesProvider owner={user.id}>
      <AdminFocusProvider owner={user.id}>
        <AdminWorkspaceTheme>
          <AdminNavigation />
          <AdminAppBoundary />
          <PullRefresh scope="admin" />
          <AdminReleaseNotice
            owner={user.id}
            releases={adminReleases.slice(0, 3)}
          />
          <main id="admin-main" className="min-w-0 overflow-x-hidden bg-white">
            <div className="admin-content mx-auto max-w-[1440px] px-4 pt-6 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-8 md:px-10 md:pt-10 lg:pb-12">
              {children}
            </div>
          </main>
        </AdminWorkspaceTheme>
      </AdminFocusProvider>
    </AdminPreferencesProvider>
  );
}
