import { adminUrl } from "@/lib/admin-url";
import type { Metadata } from "next";
import Link from "@/components/admin/AdminLink";
import { listLeadership } from "@/lib/leadership";
import { ProfileTabs } from "@/components/admin/profile-tabs";

export const metadata: Metadata = { title: "Leadership — whatelz.ai Admin" };

function formatPeriod(start: string, end: string | null): string {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-SG", {
      month: "short",
      year: "numeric",
    });
  return end ? `${fmt(start)} – ${fmt(end)}` : `${fmt(start)} – Present`;
}

export default async function AdminLeadershipPage() {
  const entries = await listLeadership(false);

  return (
    <div className="max-w-3xl space-y-8">
      <ProfileTabs active="leadership" />
      <div className="border-b border-zinc-200 pb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
          Profile
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
          Leadership
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Edit entries via Claude Chat using{" "}
          <span className="font-mono">update_leadership</span> or{" "}
          <span className="font-mono">patch_leadership_content</span>.
        </p>
      </div>

      <div className="divide-y divide-zinc-100 rounded border border-zinc-200">
        {entries.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-400">
            No leadership entries yet.
          </p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="px-4 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-900">
                      {entry.organisation}
                    </p>
                    <span className="text-zinc-300">·</span>
                    <p className="text-sm text-zinc-700">{entry.role}</p>
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
                        entry.published
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {entry.published ? "live" : "draft"}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-zinc-400">
                    {formatPeriod(entry.start_date, entry.end_date)} ·
                    /leadership/{entry.slug}
                  </p>
                  {entry.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {entry.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500"
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
                    href={adminUrl(`/admin/leadership/${entry.id}`)}
                    className="font-mono text-xs text-zinc-500 transition-colors hover:text-zinc-900"
                  >
                    Edit content →
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
