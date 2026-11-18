import { Suspense } from "react";
import { CalendarWorkspace } from "@/components/admin/calendar/CalendarWorkspace";
import { AdminText } from "@/components/admin/AdminPreferences";
import { loadAdminCalendar } from "@/lib/admin-calendar/server";
import { dailyOwner } from "@/lib/daily/server";
import { singaporeDay } from "@/lib/daily/model";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Calendar — Admin",
  robots: { index: false, follow: false },
};
async function CalendarData() {
  const data = await loadAdminCalendar();
  return <CalendarWorkspace {...data} today={singaporeDay()} />;
}
export default async function Page() {
  await dailyOwner();
  return (
    <div className="admin-ledger">
      <header className="ledger-title">
        <h1>
          <AdminText text="Calendar" />
        </h1>
      </header>
      <Suspense fallback={<p role="status">Reading calendar…</p>}>
        <CalendarData />
      </Suspense>
    </div>
  );
}
