"use client";
import { CalendarDays, Bot, Network, BriefcaseBusiness } from "lucide-react";
import { workLanes } from "@/lib/admin-week";
import Link from "./AdminLink";
import { adminUrl } from "@/lib/admin-url";
import { useAdminPreferences } from "./AdminPreferences";
const icons = {
  "ai-business": Bot,
  "network-marketing": Network,
  "day-job": BriefcaseBusiness,
  personal: CalendarDays,
};
export function WorkspaceShortcuts() {
  const { t } = useAdminPreferences();
  return (
    <nav
      className="workspace-icon-grid horizon-workspaces"
      aria-label={t("Workspaces")}
    >
      {workLanes.map((l) => {
        const Icon = icons[l.lane];
        return (
          <Link
            key={l.lane}
            href={adminUrl(l.path)}
            className="workspace-shortcut"
            data-lane={l.lane}
          >
            <span className="workspace-shortcut-icon">
              <Icon size={26} aria-hidden="true" />
            </span>
            <span className="workspace-shortcut-label">{t(l.label)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
