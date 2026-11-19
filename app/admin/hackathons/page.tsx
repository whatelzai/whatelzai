import { adminUrl } from "@/lib/admin-url";
import type { Metadata } from "next";
import Link from "@/components/admin/AdminLink";
import { listHackathons } from "@/lib/hackathons";
import { awardRankScore } from "@/lib/hackathons";
import { ProfileTabs } from "@/components/admin/profile-tabs";

export const metadata: Metadata = { title: "Hackathons — whatelz.ai admin" };

export const dynamic = "force-dynamic";

export default async function AdminHackathonsPage() {
  const hackathons = await listHackathons(false);

  const sorted = [...hackathons].sort((a, b) => {
    const rankDiff = awardRankScore(a.awards) - awardRankScore(b.awards);
    if (rankDiff !== 0) return rankDiff;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return (
    <div className="max-w-4xl space-y-6">
      <ProfileTabs active="hackathons" />
      <div className="flex items-start justify-between border-b border-zinc-200 pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
            Admin
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
            Hackathons
          </h1>
        </div>
        <Link
          href={adminUrl("/admin/hackathons/new")}
          className="border border-zinc-900 px-4 py-2 font-mono text-xs uppercase tracking-widest text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white"
        >
          + New
        </Link>
      </div>

      {sorted.length === 0 ? (
        <p className="font-mono text-sm text-zinc-400">No hackathons yet.</p>
      ) : (
        <div className="border border-zinc-200 rounded divide-y divide-zinc-100">
          {sorted.map((h) => (
            <Link
              key={h.id}
              href={adminUrl(`/admin/hackathons/${h.id}`)}
              className="flex items-center justify-between px-4 py-4 hover:bg-zinc-50 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <p className="font-medium text-zinc-900 text-sm">{h.name}</p>
                  {!h.published && (
                    <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded">
                      draft
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {h.awards.map((a, i) => (
                    <span
                      key={i}
                      className="font-mono text-[10px] text-zinc-500"
                    >
                      {a.title}
                      {a.track ? ` (${a.track})` : ""}
                    </span>
                  ))}
                </div>
              </div>
              <p className="font-mono text-xs text-zinc-400 shrink-0 ml-4">
                {new Date(h.date).toLocaleDateString("en-SG", {
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
