"use client";
import type { AdminRelease } from "@/lib/admin-releases/model";
import { useAdminPreferences } from "../AdminPreferences";
export function AdminReleaseList({ releases }: { releases: AdminRelease[] }) {
  const { preferences } = useAdminPreferences();
  const zh = preferences.language === "zh";
  return (
    <ol className="admin-release-list">
      {releases.map((r) => (
        <li key={r.id}>
          <article>
            <time dateTime={r.date}>
              {new Date(r.date + "T12:00:00Z").toLocaleDateString(
                zh ? "zh-SG" : "en-SG",
                {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  timeZone: "Asia/Singapore",
                },
              )}
            </time>
            <h3>{zh ? r.titleZh : r.title}</h3>
            <ul>
              {r.items.map((item, i) => (
                <li key={i}>{zh ? item.zh : item.en}</li>
              ))}
            </ul>
          </article>
        </li>
      ))}
    </ol>
  );
}
