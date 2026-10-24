import Link from "./AdminLink";
import { AdminText } from "./AdminPreferences";
import { loadDailyTasks } from "@/lib/daily/server";
import { singaporeDay } from "@/lib/daily/model";
import { selectedSprint } from "@/lib/admin-reading";
import { adminUrl } from "@/lib/admin-url";
export async function DayJobWork() {
  const day = singaporeDay();
  let tasks = null;
  try {
    tasks = (await loadDailyTasks(day)).active.filter(
      (t) => t.lane === "day-job",
    );
  } catch {
    /* preserve unavailable */
  }
  const next = tasks ? selectedSprint(tasks, day)[0] : null;
  const upcoming = tasks
    ?.filter((t) => t.accepted_on && t.status === "open" && t.due_on > day)
    .slice(0, 3);
  const blocked = tasks
    ?.filter((t) => t.accepted_on && ["blocked", "waiting"].includes(t.status))
    .slice(0, 3);
  return (
    <div className="dayjob-work">
      <section className="focus-next">
        <p className="focus-caption">
          <AdminText text="My next sprint" />
        </p>
        <h2>
          {next?.title ?? (
            <AdminText
              text={
                tasks
                  ? "Choose the next work priority."
                  : "Work priorities could not be loaded."
              }
            />
          )}
        </h2>
        <Link
          className="focus-text-link"
          href={adminUrl("/admin/today#commitments")}
        >
          <AdminText text="Review commitments" />
        </Link>
      </section>
      <div className="dayjob-lists">
        <section>
          <h2>
            <AdminText text="Upcoming deadlines" />
          </h2>
          {upcoming?.length ? (
            <ul>
              {upcoming.map((t) => (
                <li key={t.id}>
                  {t.title}
                  <small>{t.due_on}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              <AdminText
                text={
                  tasks
                    ? "No upcoming accepted work in the loaded set."
                    : "Deadlines unavailable."
                }
              />
            </p>
          )}
        </section>
        <section>
          <h2>
            <AdminText text="Blockers & handoffs" />
          </h2>
          {blocked?.length ? (
            <ul>
              {blocked.map((t) => (
                <li key={t.id}>
                  {t.title}
                  <small>
                    <AdminText
                      text={t.status === "blocked" ? "Blocked" : "Waiting"}
                    />
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              <AdminText
                text={
                  tasks
                    ? "No accepted blocked or waiting work in the loaded set."
                    : "Blockers unavailable."
                }
              />
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
