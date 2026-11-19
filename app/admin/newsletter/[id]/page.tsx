import { adminUrl } from "@/lib/admin-url";
import type { Metadata } from "next";
import Link from "@/components/admin/AdminLink";
import { notFound } from "next/navigation";
import { getIssueById, listDistributions } from "@/lib/newsletter";
import { IssueEditor } from "../_components/IssueEditor";
import { DistributionsPanel } from "./_DistributionsPanel";

export const metadata: Metadata = { title: "Edit issue — Admin" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditIssuePage({ params }: Props) {
  const { id } = await params;
  const issue = await getIssueById(id);
  if (!issue) notFound();

  const distributions = await listDistributions(id);

  return (
    <div className="max-w-3xl space-y-10">
      <div className="border-b border-zinc-200 pb-6">
        <Link
          href={adminUrl("/admin/newsletter")}
          className="font-mono text-xs uppercase tracking-widest text-zinc-400 hover:text-zinc-900"
        >
          ← Newsletter
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
          {issue.title}
        </h1>
      </div>

      <IssueEditor
        initial={{
          id: issue.id,
          slug: issue.slug,
          title: issue.title,
          subtitle: issue.subtitle,
          summary: issue.summary,
          content: issue.content,
          status: issue.status,
          issue_number: issue.issue_number,
        }}
      />

      <div className="border-t border-zinc-200 pt-8">
        <DistributionsPanel
          issueId={issue.id}
          initial={distributions.map((d) => ({
            id: d.id,
            platform: d.platform,
            external_url: d.external_url,
            published_at: d.published_at,
            notes: d.notes,
          }))}
        />
      </div>
    </div>
  );
}
