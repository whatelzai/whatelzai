import { adminUrl } from "@/lib/admin-url";
import type { Metadata } from "next";
import Link from "@/components/admin/AdminLink";
import { listCareer } from "@/lib/career";
import { ProfileTabs } from "@/components/admin/profile-tabs";

export const metadata: Metadata = { title: "Career — whatelz.ai Admin" };

export default async function AdminCareerPage() {
  const entries = await listCareer(false);

  return (
    <div className="max-w-3xl space-y-8">
      <ProfileTabs active="career" />
      <div className="border-b border-zinc-200 pb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
          Profile
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
          Career
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Edit entries via Claude Chat using{" "}
          <span className="font-mono">update_career</span> or{" "}
          <span className="font-mono">patch_career_content</span>.
        </p>
      </div>

      <div className="border border-zinc-200 rounded divide-y divide-zinc-100">
        {entries.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-400">
            No career entries yet.
          </p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="px-4 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-zinc-900">
                      {entry.company}
                    </p>
                    <span className="text-zinc-300">·</span>
                    <p className="text-sm text-zinc-700">{entry.role}</p>
                    <span
                      className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                        entry.published
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {entry.published ? "live" : "draft"}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-zinc-400">
                    {entry.start_date} — {entry.end_date ?? "present"} ·
                    /career/{entry.slug}
                  </p>
                  {entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {entry.tags.map((t) => (
                        <span
                          key={t}
                          className="font-mono text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-2">
                  <span className="font-mono text-xs text-zinc-400">
                    {entry.id.slice(0, 8)}
                  </span>
                  <Link
                    href={adminUrl(`/admin/career/${entry.id}`)}
                    className="font-mono text-xs text-zinc-500 transition-colors hover:text-zinc-900"
                  >
                    Edit content →
                  </Link>
                </div>
              </div>
              {entry.description && (
                <p className="mt-2 text-xs text-zinc-500 line-clamp-2">
                  {entry.description}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
