import { requireAdmin } from "@/lib/users";
import { adminUrl } from "@/lib/admin-url";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "@/components/admin/AdminLink";
import { getProject } from "@/lib/projects";
import { supabaseAdmin } from "@/lib/supabase-server";
import { ContentEditor } from "@/components/admin/ContentEditor";

export const metadata: Metadata = {
  title: "Edit Project Content — whatelz.ai Admin",
};

type Props = { params: Promise<{ id: string }> };

async function saveContent(id: string, content: string) {
  "use server";
  await requireAdmin();
  await supabaseAdmin
    .from("projects")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", id);
}

export default async function AdminProjectContentPage({ params }: Props) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  return (
    <div className="max-w-3xl space-y-8">
      <div className="border-b border-zinc-200 pb-6">
        <Link
          href={adminUrl("/admin/projects")}
          className="font-mono text-xs uppercase tracking-widest text-zinc-400 transition-colors hover:text-zinc-900"
        >
          ← Projects
        </Link>
        <p className="mt-4 font-mono text-xs uppercase tracking-widest text-zinc-400">
          Profile · Projects
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
          {project.name}
        </h1>
        {project.tagline && (
          <p className="text-sm text-zinc-500">{project.tagline}</p>
        )}
        <p className="mt-1 font-mono text-xs text-zinc-400">
          /projects/{project.slug}
        </p>
      </div>

      <ContentEditor
        initial={project.content ?? ""}
        onSave={saveContent.bind(null, id)}
        label="Case Study"
      />
    </div>
  );
}
