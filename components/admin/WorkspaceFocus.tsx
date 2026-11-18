import { loadAdminCalendar } from "@/lib/admin-calendar/server";
import { loadDailyTasks } from "@/lib/daily/server";
import { singaporeDay, type Task } from "@/lib/daily/model";
import { WorkspaceFocusView } from "./WorkspaceFocusView";
import { AdminText } from "./AdminPreferences";
export function WorkspaceFocusLoading() {
  return (
    <div className="workspace-horizons" aria-busy="true" role="status">
      {["Today’s focus", "This week’s focus"].map((title) => (
        <section key={title}>
          <h2>
            <AdminText text={title} />
          </h2>
          <div className="admin-skeleton horizon-skeleton" aria-hidden="true" />
        </section>
      ))}
    </div>
  );
}
export async function WorkspaceFocus({ lane }: { lane?: Task["lane"] }) {
  const day = singaporeDay();
  const [tasks, calendar] = await Promise.allSettled([
    loadDailyTasks(day),
    lane === "personal"
      ? Promise.resolve({ events: [], unavailable: [] })
      : loadAdminCalendar(),
  ]);
  return (
    <WorkspaceFocusView
      lane={lane}
      day={day}
      tasks={tasks.status === "fulfilled" ? tasks.value.active : null}
      events={calendar.status === "fulfilled" ? calendar.value.events : []}
      unavailable={
        calendar.status === "fulfilled"
          ? calendar.value.unavailable
          : [
              "AI events",
              "Founder’s Club import",
              "Network Marketing planning dates",
              "Company sprints",
            ]
      }
    />
  );
}
