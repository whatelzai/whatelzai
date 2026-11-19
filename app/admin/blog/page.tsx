import { adminUrl } from "@/lib/admin-url";
import type { Metadata } from "next";
import Link from "@/components/admin/AdminLink";
import { supabaseAdmin } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Blog — whatelz.ai admin" };

export default async function AdminBlogPage() {
  const { data: posts } = await supabaseAdmin
    .from("blog_posts")
    .select("id, slug, title, status, tags, published_at, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-start justify-between border-b border-zinc-200 pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
            Admin
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
            Blog
          </h1>
        </div>
        <Link
          href={adminUrl("/admin/blog/new")}
          className="border border-zinc-900 px-4 py-2 font-mono text-xs uppercase tracking-widest text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white"
        >
          + New post
        </Link>
      </div>

      <div className="border border-zinc-200 rounded divide-y divide-zinc-100">
        {(posts ?? []).length === 0 && (
          <p className="px-4 py-6 text-sm text-zinc-400">No posts yet.</p>
        )}
        {(posts ?? []).map((post) => (
          <div
            key={post.id}
            className="flex items-center justify-between px-4 py-4 gap-4"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-900 truncate">
                {post.title}
              </p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="font-mono text-xs text-zinc-400">
                  {post.slug}
                </span>
                {(post.tags as string[]).map((tag: string) => (
                  <span
                    key={tag}
                    className="font-mono text-xs bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <span
                className={`font-mono text-xs uppercase ${post.status === "published" ? "text-green-600" : "text-zinc-400"}`}
              >
                {post.status}
              </span>
              <span className="text-xs text-zinc-300">
                {new Date(post.updated_at as string).toLocaleDateString()}
              </span>
              <Link
                href={adminUrl(`/admin/blog/${post.id}`)}
                className="font-mono text-xs text-zinc-400 hover:text-zinc-900"
              >
                Edit →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
