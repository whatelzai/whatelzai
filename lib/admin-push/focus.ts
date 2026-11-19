import { DEFAULT_FOCUS, focusAt, validFocusSettings } from "../admin-focus";
import { cleanAdminPath } from "../admin-navigation";

/** Only recent real transitions: no onboarding, midnight duplicates or old catch-up. */
export function focusPushCandidate(now: Date, stored: unknown, since: string) {
  const config = stored == null ? DEFAULT_FOCUS : stored;
  if (!validFocusSettings(config) || !config.enabled) return null;
  const next = focusAt(now, config);
  const age = now.getTime() - next.startsAt;
  if (
    !Number.isFinite(Date.parse(since)) ||
    next.startsAt < Date.parse(since) ||
    age < 0 ||
    age >= 300000
  )
    return null;
  const previous = focusAt(new Date(next.startsAt - 1), config);
  if (previous.space === next.space) return null;
  return {
    title: `Time for ${next.space}`,
    url: cleanAdminPath(next.path),
    tag: `focus-${next.key}`,
    path: `focus:${next.key}`,
    endsAt: next.endsAt,
  };
}
