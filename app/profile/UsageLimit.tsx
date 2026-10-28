"use client";
import { useMemberLanguage } from "@/components/fcos/MemberLanguage";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { percentage, resetCountdown } from "@/lib/profile/usage";

export function UsageLimit({
  remaining,
  baseline,
  reserved,
  renewsAt,
  observedAt,
}: {
  remaining: number;
  baseline: number;
  reserved: number;
  renewsAt: string | null;
  observedAt: string;
}) {
  const { language, t } = useMemberLanguage();
  const [now, setNow] = useState(Date.parse(observedAt));
  const router = useRouter();
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    if (!renewsAt) return;
    const delay = Date.parse(renewsAt) - Date.now();
    if (delay <= 0) {
      router.refresh();
      return;
    }
    const timer = window.setTimeout(() => router.refresh(), delay + 100);
    return () => window.clearTimeout(timer);
  }, [renewsAt, router]);
  const left = percentage(remaining, baseline);
  return (
    <>
      <h2 className="text-xl font-bold">{t("Weekly limit")}</h2>
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 text-sm text-zinc-500">
        <span>
          {renewsAt
            ? resetCountdown(renewsAt, now, language)
            : t("Your seven-day window starts with your first message.")}
        </span>
        <strong className="text-lg font-semibold text-zinc-900">
          {Math.round(left)}% {language === "zh" ? "剩余" : "left"}
        </strong>
      </div>
      <div
        role="progressbar"
        aria-label={t("Weekly AI allowance remaining")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(left)}
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-zinc-100"
      >
        <div
          className="h-full rounded-full bg-orange-500"
          style={{ width: `${left}%` }}
        />
      </div>
      {reserved > 0 && (
        <p className="mt-3 text-xs text-zinc-500">
          {Math.round(percentage(reserved, baseline))}%{" "}
          {language === "zh" ? "处理中" : "in progress"}
        </p>
      )}
    </>
  );
}
