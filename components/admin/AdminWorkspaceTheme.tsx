"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { calendarScope, calendarWorkspace } from "@/lib/admin-calendar/scope";
import { adminNavigation } from "@/lib/admin-navigation";

export function AdminWorkspaceTheme({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname(),
    search = useSearchParams();
  const base = adminNavigation(pathname);
  const current = /^\/(admin\/)?calendar(?:\/|$)/.test(pathname)
    ? {
        ...base,
        workstream: calendarWorkspace(calendarScope(search.get("space"))),
      }
    : base;
  const workspace =
    current.workstream === "Personal"
      ? "personal"
      : current.workstream === "AI Business"
        ? "ai"
        : current.workstream === "Network Marketing"
          ? "network"
          : current.workstream === "Day Job"
            ? "day-job"
            : "neutral";
  return (
    <div
      data-admin-workspace={workspace}
      className="admin-workspace-shell min-h-dvh"
    >
      {children}
    </div>
  );
}
