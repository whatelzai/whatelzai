import { adminUrl } from "@/lib/admin-url";
import type { Metadata } from "next";
import Link from "@/components/admin/AdminLink";
import { listIssues, subscriberStats } from "@/lib/newsletter";

export const metadata: Metadata = { title: "Newsletter — Admin" };
export const dynamic = "force-dynamic";

export default async function NewsletterAdminPage() {
  const [issues, stats] = await Promise.all([
    listIssues(true),
    subscriberStats(),
  ]);
  const drafts = issues.filter((i) => i.status === "draft");
  const sent = issues.filter((i) => i.status === "sent");

  return (
    <div className="max-w-3xl space-y-8">
      <header className="flex items-start justify-between border-b border-zinc-200 pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
            Admin
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
            Newsletter
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            What ELZ This Week? — {stats.confirmed} confirmed subscriber
            {stats.confirmed === 1 ? "" : "s"}
            {stats.unsubscribed > 0 && ` · ${stats.unsubscribed} unsubscribed`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={adminUrl("/admin/newsletter/subscribers")}
            className="border border-zinc-200 px-4 py-2 font-mono text-xs uppercase tracking-widest text-zinc-600 transition-colors hover:border-zinc-900 hover:text-zinc-900"
          >
            Subscribers
          </Link>
          <Link
            href={adminUrl("/admin/newsletter/new")}
            className="border border-zinc-900 px-4 py-2 font-mono text-xs uppercase tracking-widest text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white"
          >
            + New issue
          </Link>
        </div>
      </header>

      {drafts.length > 0 && (
        <section>
          <h2 className="font-mono text-xs uppercase tracking-widest text-zinc-500">
            Drafts ({drafts.length})
          </h2>
          <div className="mt-3 border border-zinc-200 rounded divide-y divide-zinc-100">
            {drafts.map((issue) => (
              <IssueRow key={issue.id} issue={issue} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-mono text-xs uppercase tracking-widest text-zinc-500">
          Sent ({sent.length})
        </h2>
        <div className="mt-3 border border-zinc-200 rounded divide-y divide-zinc-100">
          {sent.length === 0 && (
            <p className="px-4 py-6 text-sm text-zinc-400">
              No issues sent yet.
            </p>
          )}
          {sent.map((issue) => (
            <IssueRow key={issue.id} issue={issue} />
          ))}
        </div>
      </section>
    </div>
  );
}

function IssueRow({
  issue,
}: {
  issue: {
    id: string;
    slug: string;
    issue_number: number;
    title: string;
    status: string;
    published_at: string | null;
    updated_at: string;
  };
}) {
  const date = issue.published_at ?? issue.updated_at;
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-zinc-400">
            #{String(issue.issue_number).padStart(3, "0")}
          </span>
          <span
            className={`font-mono text-[10px] uppercase tracking-widest ${
              issue.status === "sent" ? "text-emerald-600" : "text-amber-600"
            }`}
          >
            {issue.status}
          </span>
        </div>
        <p className="mt-1 text-sm font-medium text-zinc-900 truncate">
          {issue.title}
        </p>
        <p className="mt-0.5 font-mono text-[10px] text-zinc-400">
          {issue.slug}
        </p>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <span className="text-xs text-zinc-300">
          {new Date(date).toLocaleDateString("en-SG", {
            month: "short",
            day: "numeric",
          })}
        </span>
        <Link
          href={adminUrl(`/admin/newsletter/${issue.id}`)}
          className="font-mono text-xs text-zinc-400 hover:text-zinc-900"
        >
          {issue.status === "draft" ? "Edit →" : "View →"}
        </Link>
      </div>
    </div>
  );
}
