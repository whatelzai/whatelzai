import "server-only";
import { syncAdminNotices } from "@/lib/admin-notifications/server";
import { supabaseAdmin as db } from "@/lib/supabase-server";
import { isOwnerUser } from "@/lib/admin-policy";
import { sendPush, pushConfigured } from "./server";
import {
  deliverEventPush,
  EVENT_PUSH_LOOKBACK,
  EVENT_PUSH_START,
  type EventPushTicket,
  type EventDelivery,
} from "./events";
export async function checkEventPush(now = new Date()) {
  const owner = process.env.WHATELZ_OWNER_USER_ID;
  const user = await db
    .from("users")
    .select("id,role")
    .eq("id", owner ?? "00000000-0000-0000-0000-000000000000")
    .maybeSingle();
  if (user.error || !isOwnerUser(user.data)) throw Error("owner_unavailable");
  await syncAdminNotices(owner!);
  if (!pushConfigured()) return { devices: 0, sent: 0, failed: 0 };
  const devices = await db
    .from("admin_push_subscriptions")
    .select("id,owner_id,encrypted_subscription,enabled_at,enabled")
    .eq("owner_id", owner!)
    .eq("enabled", true)
    .limit(11);
  if (devices.error || (devices.data?.length ?? 0) > 10)
    throw Error("devices_unavailable");
  if (!devices.data?.length) return { devices: 0, sent: 0, failed: 0 };
  const cutoff = new Date(
    Math.max(Date.parse(EVENT_PUSH_START), now.getTime() - EVENT_PUSH_LOOKBACK),
  ).toISOString();
  const tickets = await db
    .from("event_registrations")
    .select("id,status,created_at", { count: "exact" })
    .eq("status", "confirmed")
    .gte("created_at", cutoff)
    .lte("created_at", now.toISOString())
    .order("created_at")
    .order("id")
    .range(0, 999);
  if (tickets.error || (tickets.count ?? 0) > 1000)
    throw Error("registrations_unavailable");
  const feedback = await db
    .from("event_feedback")
    .select("id,event_id,created_at")
    .gte("created_at", cutoff)
    .lte("created_at", now.toISOString())
    .order("created_at")
    .order("id")
    .limit(1000);
  if (feedback.error) throw Error("feedback_unavailable");
  const activity: EventPushTicket[] = [
    ...(tickets.data ?? []),
    ...(feedback.data ?? []).map((f) => ({
      id: f.id,
      created_at: f.created_at,
      status: "confirmed",
      feedbackEventId: f.event_id,
    })),
  ].sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (!activity.length)
    return { devices: devices.data.length, sent: 0, failed: 0 };
  const results = await Promise.allSettled(
    devices.data.map(async (device) => {
      const history = await db
        .from("admin_push_deliveries")
        .select("document_path,status,attempts", { count: "exact" })
        .eq("subscription_id", device.id)
        .or(
          "document_path.like.event-registration/%,document_path.like.event-feedback/%",
        )
        .gte("attempted_at", cutoff)
        .range(0, 999);
      if (history.error || (history.count ?? 0) > 1000)
        throw Error("delivery_state_unavailable");
      return deliverEventPush(
        activity,
        device.enabled_at,
        now,
        history.data as EventDelivery[],
        {
          claim: async (path, hash) => {
            const r = await db.rpc("claim_admin_push", {
              p_subscription: device.id,
              p_document: path,
              p_hash: hash,
            });
            if (r.error) throw Error("delivery_claim_unavailable");
            return !!r.data;
          },
          send: (notice) => sendPush(device, notice),
          save: async (path, ok) => {
            const r = await db
              .from("admin_push_deliveries")
              .update({
                status: ok ? "sent" : "failed",
                ...(ok ? { sent_at: new Date().toISOString() } : {}),
              })
              .eq("subscription_id", device.id)
              .eq("document_path", path);
            if (r.error) throw Error("delivery_state_unavailable");
          },
        },
      );
    }),
  );
  let sent = 0,
    failed = 0;
  for (const r of results) {
    if (r.status === "fulfilled") {
      sent += r.value.sent;
      failed += r.value.failed;
    } else failed++;
  }
  return { devices: devices.data.length, sent, failed };
}
