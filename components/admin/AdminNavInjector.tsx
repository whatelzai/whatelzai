"use client";

import { useRegisterNav } from "@/lib/shell/nav-registry";

const ADMIN_NAV = [
  { type: "link" as const, href: "/admin", label: "Dashboard" },
  {
    type: "group" as const,
    label: "Profile",
    children: [
      { href: "/admin/resume", label: "Resume" },
      { href: "/admin/career", label: "Career" },
      { href: "/admin/hackathons", label: "Hackathons" },
      { href: "/admin/projects", label: "Projects" },
      { href: "/admin/leadership", label: "Leadership" },
      { href: "/admin/mentorship", label: "Mentorship" },
    ],
  },
  { type: "link" as const, href: "/admin/media", label: "Media" },
  { type: "link" as const, href: "/admin/presence", label: "Presence" },
  { type: "link" as const, href: "/admin/blog", label: "Blog" },
];

export function AdminNavInjector() {
  useRegisterNav(ADMIN_NAV);
  return null;
}
