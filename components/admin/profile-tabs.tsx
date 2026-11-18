"use client";
import { adminUrl } from "@/lib/admin-url";

import Link from "@/components/admin/AdminLink";

// Tab bar for /admin/profile/[section]. Each tab is a real URL so
// deep-linking works and section-swaps don't re-mount the whole shell.
export type ProfileTab =
  | "about"
  | "projects"
  | "career"
  | "hackathons"
  | "leadership"
  | "mentorship";

// Tabs link to the existing per-section admin URLs — no new URL scheme.
// This keeps direct links stable and avoids duplicating list-render logic.
const TABS: readonly { key: ProfileTab; label: string; href: string }[] = [
  { key: "about", label: "About", href: "/admin/ai-business/profile" },
  { key: "projects", label: "Projects", href: "/admin/projects" },
  { key: "career", label: "Career", href: "/admin/career" },
  { key: "hackathons", label: "Hackathons", href: "/admin/hackathons" },
  { key: "leadership", label: "Leadership", href: "/admin/leadership" },
  { key: "mentorship", label: "Mentorship", href: "/admin/mentorship" },
];

export function ProfileTabs({ active }: { active: ProfileTab }) {
  return (
    <nav className="-mx-4 overflow-x-auto sm:mx-0">
      <ul className="flex min-w-max gap-1 border-b border-zinc-200 px-4 sm:px-0">
        {TABS.map((t) => {
          const isActive = t.key === active;
          return (
            <li key={t.key}>
              <Link
                href={adminUrl(t.href)}
                className={`inline-block border-b-2 px-4 py-3 font-mono text-xs uppercase tracking-widest transition-colors ${
                  isActive
                    ? "border-zinc-900 text-zinc-900"
                    : "border-transparent text-zinc-400 hover:border-zinc-300 hover:text-zinc-900"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
