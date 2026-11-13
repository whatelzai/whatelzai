"use client";
import { useAdminPreferences } from "./AdminPreferences";
import Link from "@/components/admin/AdminLink";
import { CalendarDays, UsersRound, Quote, BookOpen } from "lucide-react";
import { adminUrl } from "@/lib/admin-url";

const groupIcons = {
  Events: CalendarDays,
  People: UsersRound,
  Proof: Quote,
  Products: BookOpen,
};

export function AdminArea({
  title,
  description,
  links,
  children,
  intro,
  groups,
  secondary,
}: {
  title: string;
  description: string;
  links: readonly { href: string; label: string; description: string }[];
  children?: React.ReactNode;
  intro?: React.ReactNode;
  secondary?: readonly { href: string; label: string; description: string }[];
  groups?: readonly {
    label: string;
    links: readonly { href: string; label: string; description: string }[];
  }[];
}) {
  const { t } = useAdminPreferences();
  function renderLink(link: {
    href: string;
    label: string;
    description: string;
  }) {
    return (
      <Link
        key={link.href}
        href={link.href.startsWith("/admin") ? adminUrl(link.href) : link.href}
        prefetch={false}
        className="admin-workspace-link"
      >
        <div>
          <span className="font-medium">{t(link.label)}</span>
          <p>{t(link.description)}</p>
        </div>
        <span aria-hidden="true">›</span>
      </Link>
    );
  }
  return (
    <div className="admin-workspace admin-ledger lane-ledger">
      <header className="admin-workspace-heading">
        <h1>{t(title)}</h1>
        <p>{t(description)}</p>
      </header>
      {intro && <div className="admin-workspace-focus">{intro}</div>}
      {links.length > 0 && (
        <div className="admin-workspace-shortcuts">{links.map(renderLink)}</div>
      )}
      {groups && (
        <div className="ledger-tool-directory">
          {groups.map((group) => {
            const Icon = groupIcons[group.label as keyof typeof groupIcons];
            return (
              <section key={group.label} aria-label={t(group.label)}>
                <h2>
                  {Icon && <Icon size={17} aria-hidden="true" />}
                  {t(group.label)}
                </h2>
                <div>{group.links.map(renderLink)}</div>
              </section>
            );
          })}
        </div>
      )}
      {secondary && secondary.length > 0 && (
        <details className="workspace-secondary">
          <summary>{t("More tools")}</summary>
          <div className="ledger-tool-directory">
            {secondary.map(renderLink)}
          </div>
        </details>
      )}
      {children}
    </div>
  );
}
