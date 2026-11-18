"use client";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { calendarScope, calendarWorkspace } from "@/lib/admin-calendar/scope";
import { adminParent } from "@/lib/admin-link-policy";
import { cleanAdminPath, adminWorkstreams } from "@/lib/admin-navigation";
import { adminUrl } from "@/lib/admin-url";
import { focusReference } from "@/lib/admin-focus/model";
import Link from "./AdminLink";
import { useAdminPreferences } from "./AdminPreferences";
export function AdminBackTrail({ pathname }: { pathname: string }) {
  const { t } = useAdminPreferences();
  const search = useSearchParams();
  const path = cleanAdminPath(pathname);
  const match = path.match(
    /^\/(personal\/|ai-business\/|network-marketing\/|day-job\/)?focus\/([^/]+)$/,
  );
  const root = match
    ? "/admin" + (match[1] ? "/" + match[1].slice(0, -1) : "")
    : adminParent(pathname);
  const horizon = search.get("horizon") === "week" ? "week" : "today";
  let reference = "";
  if (match) {
    try {
      reference = focusReference(decodeURIComponent(match[2]));
    } catch {
      reference = t("Details");
    }
  }
  const scope = adminWorkstreams.find((w) => w.path === root);
  const scopeFilter = calendarScope(search.get("space"));
  const crumbs =
    path === "/calendar"
      ? [
          { label: "Home", href: "/admin" },
          {
            label: "Calendar",
            ...(scopeFilter !== "all" ? { href: "/admin/calendar" } : {}),
          },
          ...(scopeFilter !== "all"
            ? [{ label: calendarWorkspace(scopeFilter) }]
            : []),
        ]
      : match
        ? [
            { label: "Home", href: "/admin" },
            ...(scope && scope.path !== "/admin"
              ? [{ label: scope.label, href: root }]
              : []),
            {
              label: horizon === "week" ? "This week’s focus" : "Today’s focus",
              href:
                root +
                "#" +
                (horizon === "week" ? "week-focus" : "today-focus"),
            },
            { label: reference },
          ]
        : [
            { label: "Home", href: "/admin" },
            ...(root !== "/admin"
              ? [
                  {
                    label:
                      scope?.label ??
                      root.split("/").at(-1)!.replaceAll("-", " "),
                    href: root,
                  },
                ]
              : []),
            {
              label: path
                .split("/")
                .at(-1)!
                .match(/^[0-9a-f-]{20,}$/i)
                ? "Details"
                : path.split("/").at(-1)!.replaceAll("-", " "),
            },
          ];
  return (
    <nav className="admin-back-row" aria-label={t("Breadcrumb")}>
      <div>
        <Link
          className="admin-back-icon"
          href={adminUrl(
            match
              ? root + "#" + (horizon === "week" ? "week-focus" : "today-focus")
              : root,
          )}
          aria-label={t("Back")}
        >
          <ArrowLeft size={15} />
        </Link>
        <ol>
          {crumbs.map((c, i) => (
            <li key={i}>
              {i > 0 && <ChevronRight size={11} aria-hidden="true" />}
              {c.href ? (
                <Link href={adminUrl(c.href)}>{t(c.label)}</Link>
              ) : (
                <span aria-current="page">{t(c.label)}</span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}
