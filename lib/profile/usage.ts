export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export type UsageAccess = {
  active: boolean;
  model: string;
  allowance_micro: number;
  current_cycle_id: string | null;
};
export type UsageCycle = {
  id: string;
  allowance_micro: number;
  spent_micro: number;
  reserved_micro: number;
  started_at: string;
  ends_at: string;
  reason: string;
};
export function percentage(value: number, total: number) {
  return total > 0 ? Math.max(0, Math.min(100, (value / total) * 100)) : 0;
}
export function resetCountdown(
  endsAt: string,
  now: number,
  language: "en" | "zh" = "en",
) {
  const remaining = Date.parse(endsAt) - now;
  if (remaining <= 0) return language === "zh" ? "正在重置…" : "Resetting…";
  const totalMinutes = Math.ceil(remaining / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (language === "zh")
    return `${days ? `${days}天 ` : ""}${hours}小时 ${minutes}分钟后重置`;
  return `Resets in ${days ? `${days}d ` : ""}${hours}h ${minutes}m`;
}
export function summarizeUsage(
  access: UsageAccess | null,
  cycles: UsageCycle[],
  now = new Date(),
) {
  const stored = cycles.find((c) => c.id === access?.current_cycle_id);
  const current =
    stored && Date.parse(stored.ends_at) > now.getTime() ? stored : undefined;
  const allowance = Number(
    current?.allowance_micro ?? access?.allowance_micro ?? 0,
  );
  const baseline = Number(access?.allowance_micro ?? 0);
  const spent = Number(current?.spent_micro ?? 0);
  const reserved = Number(current?.reserved_micro ?? 0);
  // Read-only projection of the same anchored windows used by reserve_member_ai.
  const previousEnd = stored ? Date.parse(stored.ends_at) : null;
  const renewal =
    previousEnd === null
      ? null
      : current
        ? previousEnd
        : previousEnd +
          (Math.floor((now.getTime() - previousEnd) / WEEK_MS) + 1) * WEEK_MS;
  return {
    allowance,
    baseline,
    spent,
    reserved,
    remaining: Math.max(0, allowance - spent - reserved),
    percent: percentage(spent + reserved, allowance),
    renewsAt: renewal === null ? null : new Date(renewal).toISOString(),
    observedAt: now.toISOString(),
    current,
  };
}

export type ResetCredit = { used_at: string | null; expires_at: string };
export function expiredReset(credit: ResetCredit, now: number) {
  return Date.parse(credit.expires_at) <= now;
}
export function availableReset(credit: ResetCredit, now: number) {
  return !credit.used_at && Date.parse(credit.expires_at) > now;
}
