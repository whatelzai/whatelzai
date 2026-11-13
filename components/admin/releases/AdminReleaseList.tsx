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
            <time dateTime={r.publishedAt ?? r.date}>
              {new Date(
                r.publishedAt ?? r.date + "T12:00:00Z",
              ).toLocaleDateString(zh ? "zh-SG" : "en-SG", {
                day: "numeric",
                month: "short",
                year: "numeric",
                timeZone: "Asia/Singapore",
              })}
              {r.publishedAt && (
                <>
                  {" "}
                  ·{" "}
                  {new Date(r.publishedAt).toLocaleTimeString("en-SG", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                    timeZone: "Asia/Singapore",
                  })}{" "}
                  SGT
                </>
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
