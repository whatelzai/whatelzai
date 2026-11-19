import { adminUrl } from "@/lib/admin-url";
import type { Metadata } from "next";
import Link from "@/components/admin/AdminLink";
import { supabaseAdmin } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Site Map — whatelz.ai" };

const STATIC_ROUTES = [
  { path: "/", title: "Homepage", edit: null },
  { path: "/about", title: "About", edit: null },
  { path: "/channels", title: "Channels", edit: null },
  { path: "/contact", title: "Contact", edit: null },
  { path: "/projects", title: "Projects", edit: null },
  { path: "/services", title: "Services", edit: null },
];

export default async function WebsitePage() {
  const [{ data: hackathons }, { data: careers }, { data: posts }] =
    await Promise.all([
      supabaseAdmin
        .from("hackathons")
        .select("id, slug, name, published")
        .order("date", { ascending: false }),
      supabaseAdmin
        .from("career")
        .select("id, slug, company, role, published")
        .order("start_date", { ascending: false }),
      supabaseAdmin
        .from("blog_posts")
        .select("id, slug, title, status")
        .order("published_at", { ascending: false, nullsFirst: false }),
    ]);

  return (
    <div className="max-w-4xl space-y-10">
      <div className="border-b border-zinc-200 pb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
          Admin
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
          Site Map
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          All public routes — view live or edit content.
        </p>
      </div>

      {/* Static routes */}
      <section className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
          Static pages
        </p>
        <div className="border border-zinc-200 rounded divide-y divide-zinc-100">
          {STATIC_ROUTES.map(({ path, title }) => (
            <div
              key={path}
              className="flex items-center justify-between px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-zinc-900">{title}</p>
                <p className="font-mono text-xs text-zinc-400">{path}</p>
              </div>
              <a
                href={adminUrl(`/admin/preview${path}`)}
                rel="noopener noreferrer"
                className="font-mono text-xs text-zinc-400 hover:text-zinc-900 transition-colors"
              >
                View ↗
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Hackathons */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
            Hackathons{" "}
            <span className="normal-case">({(hackathons ?? []).length})</span>
          </p>
          <Link
            href={adminUrl("/admin/hackathons")}
            className="font-mono text-xs text-zinc-400 hover:text-zinc-900"
          >
            Manage →
          </Link>
        </div>
        <div className="border border-zinc-200 rounded divide-y divide-zinc-100">
          {(hackathons ?? []).length === 0 ? (
            <p className="px-4 py-4 text-sm text-zinc-400">
              No hackathons yet.
            </p>
          ) : (
            (hackathons ?? []).map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-900 truncate">
                      {h.name}
                    </p>
                    <span
                      className={`shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded ${
                        h.published
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {h.published ? "live" : "draft"}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-zinc-400">
                    /hackathons/{h.slug}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  {h.published && (
                    <a
                      href={adminUrl(`/admin/preview/hackathons/${h.slug}`)}
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-zinc-400 hover:text-zinc-900"
                    >
                      View ↗
                    </a>
                  )}
                  <Link
                    href={adminUrl(`/admin/hackathons/${h.id}`)}
                    className="font-mono text-xs text-zinc-400 hover:text-zinc-900"
                  >
                    Edit →
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Career */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
            Career{" "}
            <span className="normal-case">({(careers ?? []).length})</span>
          </p>
          <Link
            href={adminUrl("/admin/career")}
            className="font-mono text-xs text-zinc-400 hover:text-zinc-900"
          >
            Manage →
          </Link>
        </div>
        <div className="border border-zinc-200 rounded divide-y divide-zinc-100">
          {(careers ?? []).length === 0 ? (
            <p className="px-4 py-4 text-sm text-zinc-400">
              No career entries yet.
            </p>
          ) : (
            (careers ?? []).map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-900 truncate">
                      {c.company} — {c.role}
                    </p>
                    <span
                      className={`shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded ${
                        c.published
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {c.published ? "live" : "draft"}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-zinc-400">
                    /career/{c.slug}
                  </p>
                </div>
                {c.published && (
                  <a
                    href={adminUrl(`/admin/preview/career/${c.slug}`)}
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-zinc-400 hover:text-zinc-900 ml-4 shrink-0"
                  >
                    View ↗
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Blog */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
            Blog <span className="normal-case">({(posts ?? []).length})</span>
          </p>
          <Link
            href={adminUrl("/admin/blog")}
            className="font-mono text-xs text-zinc-400 hover:text-zinc-900"
          >
            Manage →
          </Link>
        </div>
        <div className="border border-zinc-200 rounded divide-y divide-zinc-100">
          {(posts ?? []).length === 0 ? (
            <p className="px-4 py-4 text-sm text-zinc-400">No posts yet.</p>
          ) : (
            (posts ?? []).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-900 truncate">
                      {p.title}
                    </p>
                    <span
                      className={`shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded ${
                        p.status === "published"
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-zinc-400">
                    /blog/{p.slug}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  {p.status === "published" && (
                    <a
                      href={adminUrl(`/admin/preview/blog/${p.slug}`)}
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-zinc-400 hover:text-zinc-900"
                    >
                      View ↗
                    </a>
                  )}
                  <Link
                    href={adminUrl(`/admin/blog/${p.id}`)}
                    className="font-mono text-xs text-zinc-400 hover:text-zinc-900"
                  >
                    Edit →
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
