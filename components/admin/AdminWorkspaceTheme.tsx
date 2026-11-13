"use client";
import { usePathname } from "next/navigation";
import { adminNavigation } from "@/lib/admin-navigation";

export function AdminWorkspaceTheme({
  children,
}: {
  children: React.ReactNode;
}) {
  const current = adminNavigation(usePathname());
  const workspace =
    current.workstream === "AI Business"
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
