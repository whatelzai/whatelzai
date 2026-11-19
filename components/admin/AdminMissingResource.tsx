"use client";
import { ArrowLeft, House, FileQuestion } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "./AdminLink";
import { useAdminPreferences } from "./AdminPreferences";
import { adminRecoveryLinks } from "@/lib/admin-recovery";

export function AdminMissingResource() {
  const { t } = useAdminPreferences();
  const links = adminRecoveryLinks(usePathname());
  return (
    <section
      className="mx-auto flex w-full max-w-lg flex-col items-start gap-5 py-12 font-sans text-zinc-900 sm:py-20"
      aria-labelledby="missing-resource-title"
    >
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-yellow-100 text-yellow-900">
        <FileQuestion size={28} aria-hidden="true" />
      </span>
      <div>
        <h1
          id="missing-resource-title"
          className="text-xl font-semibold tracking-tight"
        >
          {t("This item isn’t available")}
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
          {t(
            "It may have moved or been removed. Return to your workspace to continue.",
          )}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          href={links.back}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-yellow-300 px-5 text-sm font-medium text-zinc-950"
        >
          {links.back === links.home ? (
            <House size={17} aria-hidden="true" />
          ) : (
            <ArrowLeft size={17} aria-hidden="true" />
          )}
          {t(links.back === links.home ? "Home" : "Back")}
        </Link>
        {links.back !== links.home && (
          <Link
            href={links.home}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-200 px-5 text-sm font-medium"
          >
            <House size={17} aria-hidden="true" />
            {t("Home")}
          </Link>
        )}
      </div>
    </section>
  );
}
