import { adminUrl } from "@/lib/admin-url";
import type { Metadata } from "next";
import Link from "@/components/admin/AdminLink";
import { listSubscribers, subscriberStats } from "@/lib/newsletter";

export const metadata: Metadata = { title: "Subscribers — Admin" };
export const dynamic = "force-dynamic";

export default async function SubscribersPage() {
  const [subscribers, stats] = await Promise.all([
    listSubscribers(),
    subscriberStats(),
  ]);

  return (
    <div className="max-w-3xl space-y-8">
      <div className="border-b border-zinc-200 pb-6">
        <Link
          href={adminUrl("/admin/newsletter")}
          className="font-mono text-xs uppercase tracking-widest text-zinc-400 hover:text-zinc-900"
        >
          ← Newsletter
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
          Subscribers
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          {stats.confirmed} confirmed · {stats.unsubscribed} unsubscribed ·{" "}
          {stats.total} total
        </p>
      </div>

      {subscribers.length === 0 ? (
        <p className="text-sm text-zinc-400">No subscribers yet.</p>
      ) : (
        <div className="border border-zinc-200 rounded divide-y divide-zinc-100">
          {subscribers.map((s) => (
            <div
              key={s.id}
              className={`flex items-center justify-between gap-4 px-4 py-3 ${s.status === "unsubscribed" ? "opacity-60" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900 truncate">
                  {s.email}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-zinc-400">
                  {s.name ?? "no name"} · {s.source ?? "no source"}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`font-mono text-[10px] uppercase tracking-widest ${
                    s.status === "confirmed"
                      ? "text-emerald-600"
                      : "text-zinc-400"
                  }`}
                >
                  {s.status}
                </span>
                <span className="text-xs text-zinc-300">
                  {new Date(s.created_at).toLocaleDateString("en-SG", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
