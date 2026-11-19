import { adminUrl } from "@/lib/admin-url";
import type { Metadata } from "next";
import Link from "@/components/admin/AdminLink";
import { IssueEditor } from "../_components/IssueEditor";

export const metadata: Metadata = { title: "New issue — Admin" };

export default function NewIssuePage() {
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
          New issue
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Issue number is auto-assigned on save (next available in the
          sequence).
        </p>
      </div>
      <IssueEditor />
    </div>
  );
}
