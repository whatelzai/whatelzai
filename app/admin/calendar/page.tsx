import { calendarScope, type CalendarScope } from "@/lib/admin-calendar/scope";
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
async function CalendarData({ lane }: { lane: CalendarScope }) {
  const data = await loadAdminCalendar();
  return <CalendarWorkspace {...data} today={singaporeDay()} lane={lane} />;
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ space?: string }>;
}) {
  await dailyOwner();
  const lane = calendarScope((await searchParams).space);
  return (
    <div className="admin-ledger calendar-page">
      <header className="sr-only">
        <h1>
          <AdminText text="Calendar" />
        </h1>
      </header>
      <Suspense fallback={<p role="status">Reading calendar…</p>}>
        <CalendarData lane={lane} />
      </Suspense>
    </div>
  );
}
