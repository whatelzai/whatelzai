import { memberTranslator } from "@/lib/fcos/language-server";
import { LanguageSwitch } from "./LanguageSwitch";
import { Suspense } from "react";
import { ReleaseArchive } from "@/components/releases/ReleaseArchive";
import { AppHeader } from "@/components/fcos/AppHeader";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "@/components/fcos/MemberLink";
import {
  LogOut,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { ensureUserRow } from "@/lib/users";
import { MemberNav } from "@/components/culture/MemberNav";
import { SignOutButton } from "@/components/auth/AuthControls";
import { InstallAppButton } from "@/components/fcos/AppInstallation";
import { loadProfileData } from "@/lib/profile/server";
import { UsageLimit } from "./UsageLimit";
import { ResetCreditButton } from "./ResetCreditButton";
import { availableReset, expiredReset } from "@/lib/profile/usage";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Profile · fcOS",
  robots: { index: false, follow: false },
};
const date = (value: string, language: string) =>
  new Intl.DateTimeFormat(language === "zh" ? "zh-SG" : "en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
const card =
  "rounded-[2rem] bg-white p-6 shadow-[0_8px_35px_rgba(0,0,0,0.035)] sm:p-8";
export default async function Profile({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; resets?: string; before?: string }>;
}) {
  const user = await ensureUserRow();
  if (!user) redirect("/sign-in");
  const { tab, resets, before } = await searchParams;
  const { language, t } = await memberTranslator();
  const resetHistory = resets === "history";
  const usageTab = tab === "usage";
  const releasesTab = tab === "releases";
  const { persona, usage } = releasesTab
    ? { persona: null, usage: null }
    : await loadProfileData();
  const observedAt = usage ? Date.parse(usage.observedAt) : 0;
  const firstName = user.name?.split(" ")[0] || "friend";
  return (
    <main className="fcos-tab-page fcos-profile-page mx-auto min-h-dvh max-w-5xl space-y-6 bg-[#f7f6f4] px-5 pb-8 pt-6 text-zinc-950 sm:px-8">
      <AppHeader
        title={releasesTab ? "Release notes" : "Profile"}
        end={
          <SignOutButton>
            <button
              aria-label={t("Sign out")}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600"
            >
              <LogOut size={20} aria-hidden="true" />
            </button>
          </SignOutButton>
        }
      />
      <MemberNav current="/profile" compact persistent accent="orange" />
      {!usageTab && !releasesTab && <LanguageSwitch />}
      {!usageTab && !releasesTab && (
        <section className="flex items-center gap-4 py-3 sm:gap-6">
          <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-orange-100 bg-orange-50 text-3xl font-semibold text-orange-600 sm:h-28 sm:w-28">
            {user.image_url ? (
              <Image
                src={user.image_url}
                alt=""
                width={112}
                height={112}
                unoptimized
                className="h-full w-full object-cover"
              />
            ) : (
              firstName.slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-[1.7rem] font-bold leading-tight tracking-tight sm:text-4xl">
              {t("Welcome back,")}
              <br />
              {firstName}.
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              {t("Current tier:")}{" "}
              <strong className="font-semibold uppercase text-zinc-600">
                {persona ?? t("Unavailable")}
              </strong>
            </p>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold text-orange-600">
              <Sparkles size={13} aria-hidden="true" />
              {t("Prepare · connect · grow")}
            </span>
          </div>
        </section>
      )}
      {!releasesTab && (
        <nav
          aria-label="Profile sections"
          className="flex rounded-2xl bg-zinc-200/60 p-1"
        >
          {[
            {
              label: "Profile",
              href: "/profile",
              selected: !usageTab && !releasesTab,
            },
            { label: "Usage", href: "/profile?tab=usage", selected: usageTab },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              aria-current={item.selected ? "page" : undefined}
              className={`flex-1 whitespace-nowrap rounded-xl px-3 py-3 text-center text-sm font-semibold ${item.selected ? "bg-white text-orange-600 shadow-sm" : "text-zinc-500"}`}
            >
              {t(item.label)}
            </Link>
          ))}
        </nav>
      )}
      {releasesTab && (
        <Link
          href="/profile"
          className="inline-flex min-h-11 items-center text-sm text-zinc-500"
        >
          ← {t("Back to Profile")}
        </Link>
      )}
      {releasesTab ? (
        <Suspense
          fallback={
            <p role="status" className="py-5 text-sm text-zinc-500">
              {t("Loading release notes…")}
            </p>
          }
        >
          <ReleaseArchive before={before} />
        </Suspense>
      ) : usageTab ? (
        <div className="space-y-5">
          {!usage ? (
            <section className={card}>
              <h2 className="text-xl font-bold">
                {t("Usage temporarily unavailable")}
              </h2>
              <p className="mt-3 text-sm text-zinc-500">
                {t("Your balance could not be checked. Reload to try again.")}
              </p>
            </section>
          ) : (
            <>
              <section className={card}>
                <UsageLimit
                  key={usage.renewsAt ?? "not-started"}
                  remaining={usage.remaining}
                  baseline={usage.baseline}
                  reserved={usage.reserved}
                  renewsAt={usage.renewsAt}
                  observedAt={usage.observedAt}
                />
                {!usage.canChat && (
                  <p className="mt-4 text-sm text-zinc-500">
                    {t("AI Chat is currently unavailable.")}
                  </p>
                )}
              </section>
              <section className={card}>
                <h2 className="text-lg font-semibold">
                  {t("Usage limit resets")}
                </h2>
                <nav
                  aria-label="Reset sections"
                  className="mt-4 flex gap-1 border-b border-zinc-100 pb-3"
                >
                  {[
                    {
                      label: `${t("Available")} ${usage.resetCredits.filter((c) => availableReset(c, observedAt)).length}`,
                      href: "/profile?tab=usage",
                      selected: !resetHistory,
                    },
                    {
                      label: t("History"),
                      href: "/profile?tab=usage&resets=history",
                      selected: resetHistory,
                    },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={item.selected ? "page" : undefined}
                      className={`min-h-11 rounded-xl px-4 py-3 text-sm font-medium ${item.selected ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:bg-zinc-50"}`}
                    >
                      {t(item.label)}
                    </Link>
                  ))}
                </nav>
                {resetHistory ? (
                  <div className="divide-y divide-zinc-100">
                    {usage.resetCredits
                      .filter((c) => c.used_at || expiredReset(c, observedAt))
                      .map((c) => (
                        <div key={c.id} className="py-4">
                          <p className="text-sm font-semibold">
                            {c.used_at
                              ? t("Full reset used")
                              : t("Full reset expired")}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {c.used_at
                              ? date(c.used_at, language)
                              : `${t("Expired")} ${date(c.expires_at, language)} · SGT`}
                          </p>
                        </div>
                      ))}
                    {usage.history
                      .filter((c) => c.reason === "owner-reset")
                      .map((c) => (
                        <div key={c.id} className="py-4">
                          <p className="text-sm font-semibold">
                            {t("Admin reset")}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {date(c.started_at, language)}
                          </p>
                        </div>
                      ))}
                    {!usage.resetCredits.some(
                      (c) => c.used_at || expiredReset(c, observedAt),
                    ) &&
                      !usage.history.some(
                        (c) => c.reason === "owner-reset",
                      ) && (
                        <p className="py-5 text-sm text-zinc-500">
                          {t("No resets used yet.")}
                        </p>
                      )}
                  </div>
                ) : (
                  <div>
                    {usage.resetCredits
                      .filter((c) => availableReset(c, observedAt))
                      .map((c) => (
                        <div
                          key={c.id}
                          className="flex items-start justify-between gap-3 pt-5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">
                              {t("Full reset")}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {t("Expires")} {date(c.expires_at, language)} ·
                              SGT
                            </p>
                          </div>
                          <ResetCreditButton
                            credit={c.id}
                            cycle={usage.currentCycleId}
                          />
                        </div>
                      ))}
                    {!usage.resetCredits.some((c) =>
                      availableReset(c, observedAt),
                    ) && (
                      <p className="py-5 text-sm text-zinc-500">
                        {t("No resets available.")}
                      </p>
                    )}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-orange-400 via-orange-500 to-red-500 p-6 text-white shadow-[0_12px_30px_rgba(249,115,22,0.16)] sm:p-8">
            <div
              className="absolute -right-8 -top-12 h-44 w-44 rounded-full border-[28px] border-white/10"
              aria-hidden="true"
            />
            <div className="relative flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/80">
                  fcOS · Founder’s Club OS
                </p>
                <h2 className="mt-2 text-2xl font-bold">{t("Member Pass")}</h2>
              </div>
              <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase">
                {persona ?? t("Unverified")}
              </span>
            </div>
            <div className="relative mt-9">
              <p className="text-lg font-semibold">
                {user.name || t("Your account")}
              </p>
              <p className="mt-1 break-all text-xs text-white/80">
                {user.email}
              </p>
            </div>
          </section>
          <section className={`${card} space-y-5`}>
            <Link
              href="/team"
              className="flex items-center justify-between text-sm font-semibold"
            >
              <span className="flex items-center gap-3">
                <UsersRound
                  size={20}
                  className="text-orange-500"
                  aria-hidden="true"
                />
                {t("View my team")}
              </span>
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
            <div className="border-t border-zinc-100 pt-5">
              <InstallAppButton accent="orange" language={language} />
            </div>
            <p className="flex items-start gap-2 text-xs leading-5 text-zinc-400">
              <ShieldCheck
                size={17}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
              {t(
                "Baobei profiles and saved HQH/HHH are visible to your team unless hidden. Your chats stay private. Signing in does not automatically link a team profile.",
              )}
            </p>
          </section>
          <Link
            href="/profile?tab=releases"
            className="flex min-h-11 items-center justify-between px-2 text-sm text-zinc-500 hover:text-zinc-800"
          >
            <span>{t("Release notes")}</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}
    </main>
  );
}
