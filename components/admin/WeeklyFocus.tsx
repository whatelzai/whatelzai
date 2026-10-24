"use client";
import { useState } from "react";
import { useAdminPreferences } from "./AdminPreferences";
import Link from "./AdminLink";
import { adminUrl } from "@/lib/admin-url";
import { weeklyWork, workLanes } from "@/lib/admin-week";
import type { Task } from "@/lib/daily/model";
export function WeeklyFocus({
  tasks,
  day,
}: {
  tasks: Task[] | null;
  day: string;
}) {
  const { t } = useAdminPreferences();
  const [focusing, setFocusing] = useState(false);
  const work = tasks ? weeklyWork(tasks, day) : null;
  const next = work?.next;
  return (
    <div className="weekly-focus-reader" data-focusing={focusing || undefined}>
      <section className="focus-next" aria-labelledby="next-sprint-heading">
        <p className="focus-caption">
          {t(focusing ? "Focused sprint" : "My next sprint")}
          {next &&
            ` · ${t(workLanes.find((l) => l.lane === next.lane)!.label)}`}
        </p>
        <h2 id="next-sprint-heading">
          {next
            ? next.title
            : t(
                tasks
                  ? "Choose one outcome to move forward."
                  : "Your commitments could not be loaded.",
              )}
        </h2>
        {next && (
          <p className="focus-meta">
            {t("Accepted")}
            {" · "}
            {next.due_on < day
              ? `${t("Carried forward")} · ${next.due_on}`
              : t("Due today")}
          </p>
        )}
        <div className="focus-actions">
          {next ? (
            <button
              type="button"
              className="focus-primary"
              aria-pressed={focusing}
              onClick={() => setFocusing((v) => !v)}
            >
              {t(focusing ? "Leave focus view" : "Start focused sprint")}
            </button>
          ) : (
            <Link
              className="focus-primary"
              href={adminUrl("/admin/today#commitments")}
            >
              {t(tasks ? "Choose my focus" : "Review commitments")}
            </Link>
          )}
          {!focusing && next && (
            <Link
              className="focus-text-link"
              href={adminUrl("/admin/today#commitments")}
            >
              {t("Choose another")}
            </Link>
          )}
        </div>
        {focusing && (
          <p role="status" className="focus-meta">
            {t(
              "One thing at a time. Leaving this view does not complete the task.",
            )}
          </p>
        )}
      </section>
      {!focusing && (
        <section aria-labelledby="week-work-heading" className="week-work">
          <h2 id="week-work-heading">{t("Accepted for this week")}</h2>
          {(work?.lanes ?? workLanes.map((l) => ({ ...l, task: null }))).map(
            (l) => (
              <Link key={l.lane} href={adminUrl(l.path)} className="week-lane">
                <span className="week-lane-name">{t(l.label)}</span>
                <span className="week-lane-work">
                  {l.task
                    ? l.task.title
                    : t(
                        tasks
                          ? "No accepted commitment due this week."
                          : "Commitments unavailable.",
                      )}
                  <small>
                    {l.task
                      ? t(
                          l.task.status === "blocked"
                            ? "Blocked"
                            : l.task.status === "waiting"
                              ? "Waiting"
                              : l.task.due_on < day
                                ? "Carried forward"
                                : "Accepted",
                        )
                      : t("Open workspace")}
                  </small>
                </span>
                <span aria-hidden="true">›</span>
              </Link>
            ),
          )}
          <details className="week-source">
            <summary>{t("About this week")}</summary>
            <p>
              {t(
                "Shows accepted unfinished commitments due by Sunday, including carried work, from the loaded set of up to 100. Weekly aspirations are not automatically accepted tasks.",
              )}
            </p>
          </details>
        </section>
      )}
    </div>
  );
}
