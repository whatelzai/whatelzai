import type { Metadata } from "next";
import Link from "@/components/admin/AdminLink";
import { ProfileTabs } from "@/components/admin/profile-tabs";

export const metadata: Metadata = { title: "My Profile — Admin" };

// About tab. There's no /admin/about surface — /about is a curated person
// page composed from other sources (site_identity, featured hackathons,
// intro copy). Text edits happen via chat with Claude Code. This tab is
// the honest signpost.
export default function ProfileAboutPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
          Admin
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          My Profile
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-600">
          Everything that describes you across the site. Public surface lives at{" "}
          <Link
            href="/about"
            className="underline underline-offset-4 hover:text-zinc-900"
          >
            /about
          </Link>
          .
        </p>
      </header>

      <ProfileTabs active="about" />

      <section className="space-y-4 border border-zinc-200 bg-white p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-zinc-900">
          About page content
        </h2>
        <p className="text-sm text-zinc-600">
          <Link
            href="/about"
            className="underline underline-offset-4 hover:text-zinc-900"
          >
            /about
          </Link>{" "}
          is a curated person page composed from Supabase (site identity,
          featured hackathons, intro copy). There&apos;s no dedicated form —
          copy edits happen via chat with Claude Code using the{" "}
          <code className="text-xs">landing.update_section</code> or
          site-identity MCP verbs.
        </p>
        <p className="text-sm text-zinc-600">
          Use the tabs above to edit the deep-link content pages (Projects,
          Career, Hackathons, Leadership, Mentorship) that back the /about
          narrative and their own SEO surfaces.
        </p>
      </section>
    </div>
  );
}
