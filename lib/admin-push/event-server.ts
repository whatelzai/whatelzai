import "server-only";
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
  if (!pushConfigured()) throw Error("push_not_configured");
  const owner = process.env.WHATELZ_OWNER_USER_ID;
  const user = await db
    .from("users")
    .select("id,role")
    .eq("id", owner ?? "00000000-0000-0000-0000-000000000000")
    .maybeSingle();
  if (user.error || !isOwnerUser(user.data)) throw Error("owner_unavailable");
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
  if (!tickets.data?.length)
    return { devices: devices.data.length, sent: 0, failed: 0 };
  const results = await Promise.allSettled(
    devices.data.map(async (device) => {
      const history = await db
        .from("admin_push_deliveries")
        .select("document_path,status,attempts", { count: "exact" })
        .eq("subscription_id", device.id)
        .like("document_path", "event-registration/%")
        .gte("attempted_at", cutoff)
        .range(0, 999);
      if (history.error || (history.count ?? 0) > 1000)
        throw Error("delivery_state_unavailable");
      return deliverEventPush(
        tickets.data as EventPushTicket[],
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
