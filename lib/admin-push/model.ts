import { z } from "zod";
import { briefPath, singaporeDay } from "@/lib/daily/model";
import { DAILY_PARENT } from "@/lib/daily/paths";
import { previousWeek } from "@/lib/daily/weekly-model";

export function trustedPushEndpoint(value: string) {
  try {
    const url = new URL(value);
    const trusted =
      [
        "fcm.googleapis.com",
        "updates.push.services.mozilla.com",
        "web.push.apple.com",
      ].includes(url.hostname) ||
      /^[a-z0-9-]+\.notify\.windows\.com$/.test(url.hostname);
    return (
      value.length <= 4096 &&
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.hash &&
      trusted
    );
  } catch {
    return false;
  }
}
const key = (length: number) =>
  z
    .string()
    .max(128)
    .regex(/^[A-Za-z0-9_-]+={0,2}$/)
    .refine((value) => Buffer.from(value, "base64url").length === length);
export const pushSubscriptionSchema = z
  .object({
    endpoint: z.string().refine(trustedPushEndpoint),
    expirationTime: z.number().nonnegative().nullable().optional(),
    keys: z.object({ p256dh: key(65), auth: key(16) }),
  })
  .strict();
export type SavedSubscription = z.infer<typeof pushSubscriptionSchema>;
export function routineCandidates(now = new Date()) {
  const day = singaporeDay(now);
  return [
    {
      path: briefPath(DAILY_PARENT, day, "morning"),
      title: "Your morning brief is ready",
      url: "/today#morning",
      tag: `morning-${day}`,
    },
    {
      path: briefPath(DAILY_PARENT, day, "evening"),
      title: "Your evening debrief is ready",
      url: "/today#evening",
      tag: `evening-${day}`,
    },
    {
      path: previousWeek(now).path,
      title: "Your weekly closeout is ready",
      url: "/today/weekly",
      tag: `weekly-${previousWeek(now).id}`,
    },
  ];
}
export function savedRoutineReady(
  doc: { content?: string; last_edited_at?: string; authored_at?: string },
  enabledAt: string,
) {
  const edited = Date.parse(doc.last_edited_at || doc.authored_at || "");
  const body = doc.content
    ?.split(/^## Notes\s*$/m)[1]
    ?.split(/^## /m)[0]
    ?.trim();
  return (
    !!body &&
    body.length >= 120 &&
    /^###\s+\S/m.test(body) &&
    Number.isFinite(edited) &&
    edited >= Date.parse(enabledAt) &&
    edited <= Date.now() + 300000
  );
}

export function notificationPayload(notice: {
  title: string;
  url: string;
  tag: string;
}) {
  return {
    title: notice.title,
    url: notice.url,
    tag: notice.tag,
    body: "Open Whatelz Admin to read it.",
  };
}
