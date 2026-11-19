import { adminUrl } from "@/lib/admin-url";
import type { Metadata } from "next";
import Link from "@/components/admin/AdminLink";
import { listProjects } from "@/lib/projects";
import { ProfileTabs } from "@/components/admin/profile-tabs";

export const metadata: Metadata = { title: "Projects — whatelz.ai Admin" };

export default async function AdminProjectsPage() {
  const projects = await listProjects();

  return (
    <div className="max-w-3xl space-y-8">
      <ProfileTabs active="projects" />
      <div className="border-b border-zinc-200 pb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
          Profile
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
          Projects
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Edit entries via Claude Chat using{" "}
          <span className="font-mono">update_project</span> or{" "}
          <span className="font-mono">patch_project_content</span>.
        </p>
      </div>

      <div className="divide-y divide-zinc-100 rounded border border-zinc-200">
        {projects.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-400">No projects yet.</p>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="px-4 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-900">
                      {project.name}
                    </p>
                    <span className="text-zinc-300">·</span>
                    <p className="text-sm text-zinc-500">{project.type}</p>
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
                        project.published
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {project.published ? "live" : "draft"}
                    </span>
                    {project.status && (
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
                        {project.status}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-zinc-400">
                    /projects/{project.slug}
                  </p>
                  {project.tagline && (
                    <p className="mt-1 text-xs text-zinc-500">
                      {project.tagline}
                    </p>
                  )}
                  {project.tech_stack && project.tech_stack.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {project.tech_stack.map((t: string) => (
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
                    {project.id.slice(0, 8)}
                  </span>
                  <Link
                    href={adminUrl(`/admin/projects/${project.id}`)}
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
