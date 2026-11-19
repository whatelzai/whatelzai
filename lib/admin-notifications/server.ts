import "server-only";
import { createHash } from "node:crypto";
import { supabaseAdmin as db } from "@/lib/supabase-server";
import { adminReleases } from "@/lib/admin-releases/data";
export async function recordAdminNotice(
  owner: string,
  source: string,
  title: string,
  url: string,
  body = "",
  createdAt = new Date().toISOString(),
) {
  if (!url.startsWith("/") || url.startsWith("//") || url.includes("\\"))
    throw Error("Invalid notification destination");
  const r = await db.from("admin_notifications").upsert(
    {
      owner_id: owner,
      source_key: source.slice(0, 500),
      title: title.slice(0, 240),
      body: body.slice(0, 2000),
      url,
      created_at: createdAt,
    },
    { onConflict: "owner_id,source_key", ignoreDuplicates: true },
  );
  if (r.error) throw Error("Notification could not be recorded");
}
export async function syncAdminNotices(owner: string) {
  const cut = new Date(Date.now() - 28 * 86400000).toISOString();
  const r = await db
    .from("event_registrations")
    .select("id,created_at,event_key")
    .eq("status", "confirmed")
    .gte("created_at", cut)
    .order("created_at", { ascending: false })
    .limit(100);
  if (r.error) throw Error("Registration notifications unavailable");
  const feedback = await db
    .from("event_feedback")
    .select("id,event_id,created_at")
    .gte("created_at", cut)
    .order("created_at", { ascending: false })
    .limit(100);
  if (feedback.error) throw Error("Feedback notifications unavailable");
  const keys = [...new Set((r.data ?? []).map((ticket) => ticket.event_key))];
  const events = keys.length
    ? await db
        .from("events")
        .select("id,metadata")
        .in("metadata->>event_key", keys)
    : { data: [], error: null };
  if (events.error) throw Error("Event destinations unavailable");
  const eventIds = new Map(
    (events.data ?? []).map((e) => [e.metadata.event_key, e.id]),
  );
  const notices = [
    ...(feedback.data ?? []).map((f) => ({
      owner_id: owner,
      source_key:
        "push:feedback-" +
        createHash("sha256").update(f.id).digest("hex").slice(0, 24),
      title: "New event feedback",
      body: "An attendee submitted feedback.",
      url:
        "/ai-business/events/" + f.event_id + "?tool=feedback#feedback-" + f.id,
      created_at: f.created_at,
    })),
    ...adminReleases.map((n) => ({
      owner_id: owner,
      source_key: "release:" + n.id,
      title: n.title,
      body: n.items.map((i) => i.en).join(" "),
      url: "/profile?tab=releases#release-" + n.id,
      created_at: n.publishedAt ?? n.date + "T00:00:00+08:00",
    })),
    ...(r.data ?? []).map((n) => ({
      owner_id: owner,
      source_key:
        "push:event-" +
        createHash("sha256").update(n.id).digest("hex").slice(0, 24),
      title: "New event registration",
      body: "A participant signed up. Open registrations for the details.",
      url: eventIds.has(n.event_key)
        ? "/ai-business/events/" + eventIds.get(n.event_key)
        : "/event-checkin",
      created_at: n.created_at,
    })),
  ];
  if (notices.length) {
    const w = await db.from("admin_notifications").upsert(notices, {
      onConflict: "owner_id,source_key",
      ignoreDuplicates: false,
    });
    if (w.error) throw Error("Notifications unavailable");
  }
}
