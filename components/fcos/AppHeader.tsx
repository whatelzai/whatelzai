"use client";
import { useMemberLanguage } from "./MemberLanguage";
import type { ReactNode } from "react";
import Link from "@/components/fcos/MemberLink";
import { PullRefresh } from "./PullRefresh";
export function AppHeader({
  title,
  start,
  end,
  chat = false,
}: {
  title: string;
  start?: ReactNode;
  end?: ReactNode;
  chat?: boolean;
}) {
  const { t } = useMemberLanguage();
  return (
    <>
      <header
        data-fcos-header
        className="fcos-app-header border-b border-zinc-100 bg-white/95 text-zinc-950 backdrop-blur-xl"
      >
        <div className="fcos-header-inner mx-auto grid h-16 max-w-5xl grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-3 px-5">
          <div className="flex items-center justify-start">
            {start ?? (
              <Link
                href="/"
                aria-label={t("fcOS home")}
                className="rounded-xl py-3 text-sm font-bold tracking-tight"
              >
                fc<span className="text-yellow-500">OS</span>
              </Link>
            )}
          </div>
          <h1 className="truncate text-center text-lg font-semibold tracking-tight">
            {t(title)}
          </h1>
          <div className="flex items-center justify-end">{end}</div>
        </div>
      </header>
      <PullRefresh chat={chat} />
    </>
  );
}
