"use client";
import { Bot, Network, BriefcaseBusiness } from "lucide-react";
import { useState } from "react";
import { useAdminPreferences } from "./AdminPreferences";
import Link from "./AdminLink";
import { adminUrl } from "@/lib/admin-url";
import { weeklyWork, workLanes } from "@/lib/admin-week";
import type { Task } from "@/lib/daily/model";
const laneIcons = {
  "ai-business": Bot,
  "network-marketing": Network,
  "day-job": BriefcaseBusiness,
};

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
          <h2 id="week-work-heading">{t("Workspaces")}</h2>
          <div className="workspace-icon-grid">
            {(work?.lanes ?? workLanes.map((l) => ({ ...l, task: null }))).map(
              (l) => {
                const Icon = laneIcons[l.lane];
                return (
                  <Link
                    key={l.lane}
                    href={adminUrl(l.path)}
                    className="workspace-shortcut"
                    data-lane={l.lane}
                  >
                    <span className="workspace-shortcut-icon">
                      <Icon size={29} strokeWidth={1.7} aria-hidden="true" />
                    </span>
                    <span className="workspace-shortcut-label">
                      {t(l.label)}
                    </span>
                    {l.task && (
                      <small title={l.task.title}>{l.task.title}</small>
                    )}
                    {!tasks && <small>{t("Unavailable")}</small>}
                  </Link>
                );
              },
            )}
          </div>
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
