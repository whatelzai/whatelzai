import { AdminText } from "./AdminPreferences";
import Link from "./AdminLink";
import { adminUrl } from "@/lib/admin-url";
import { loadDailyTasks } from "@/lib/daily/server";
import { singaporeDay, type Task } from "@/lib/daily/model";
import { selectedSprint } from "@/lib/admin-reading";
export async function SprintFocus({ lane }: { lane: Task["lane"] }) {
  const day = singaporeDay();
  let tasks: Task[] | null = null;
  try {
    tasks = (await loadDailyTasks(day)).active;
  } catch {
    /* unavailable is not an empty list */
  }
  const focus = tasks ? selectedSprint(tasks, day, lane) : [];
  return (
    <section
      aria-label="Current focus"
      className="admin-sprint-focus border-l-2 border-yellow-400 pl-5"
    >
      <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-500">
        <AdminText text="Current focus" />
      </h2>
      {focus.length ? (
        <div className="mt-4">
          <p className="text-xl font-medium leading-snug">{focus[0].title}</p>
          <p className="mt-2 text-xs text-zinc-500">
            Accepted ·{" "}
            {focus[0].due_on < day
              ? `Carried forward · ${focus[0].due_on}`
              : "Due today"}
          </p>
          {focus.length > 1 && (
            <details className="mt-3">
              <summary className="min-h-11 cursor-pointer py-3 text-sm text-zinc-500">
                <AdminText text="Also accepted" />
              </summary>
              <ul className="space-y-3 pb-3">
                {focus.slice(1).map((task) => (
                  <li key={task.id} className="text-sm">
                    {task.title}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-zinc-600">
          <AdminText
            text={
              tasks
                ? "No accepted work ready for this block."
                : "Your saved focus could not be loaded."
            }
          />
        </p>
      )}
      <Link
        href={adminUrl("/admin/today#commitments")}
        className="mt-4 inline-flex min-h-11 items-center text-sm underline underline-offset-4"
      >
        <AdminText text="Review in Today →" />
      </Link>
    </section>
  );
}
