import "server-only";
import { recordAdminNotice } from "@/lib/admin-notifications/server";
import { createHash } from "node:crypto";
import {
  DEFAULT_FOCUS,
  validFocusSettings,
  type FocusSettings,
} from "@/lib/admin-focus";
import { focusPushCandidate } from "./focus";
import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabase-server";
import { decryptSecret, encryptSecret } from "@/lib/daily/crypto";
import { isOwnerUser } from "@/lib/admin-policy";
import { emdeeConnection } from "@/lib/daily/connections";
import { readEmdee } from "@/lib/daily/emdee-client";
import { DAILY_PARENT } from "@/lib/daily/paths";
import {
  pushSubscriptionSchema,
  routineCandidates,
  savedRoutineReady,
  notificationPayload,
  type SavedSubscription,
} from "./model";

type Device = {
  id: string;
  owner_id: string;
  encrypted_subscription: string;
  enabled_at: string;
  enabled: boolean;
  focus_settings?: unknown;
  focus_hash?: string | null;
  focus_updated_at?: string;
};
export const endpointHash = (endpoint: string) =>
  createHash("sha256").update(endpoint).digest("hex");
export function pushConfigured() {
  return !!(
    process.env.ADMIN_PUSH_PUBLIC_KEY &&
    process.env.ADMIN_PUSH_PRIVATE_KEY &&
    process.env.DAILY_INTEGRATION_KEY
  );
}
export async function savePushDevice(
  owner: string,
  subscription: SavedSubscription,
  focus?: FocusSettings,
) {
  const hash = endpointHash(subscription.endpoint);
  const { data: prior, error: priorError } = await supabaseAdmin
    .from("admin_push_subscriptions")
    .select("enabled,enabled_at")
    .eq("owner_id", owner)
    .eq("endpoint_hash", hash)
    .maybeSingle();
  if (priorError) throw Error("Device status could not be checked.");
  const { count, error: countError } = await supabaseAdmin
    .from("admin_push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", owner)
    .eq("enabled", true);
  if (countError || (!prior?.enabled && (count ?? 0) >= 10))
    throw Error(
      "Device registration is unavailable. Disable an old device first.",
    );
  const { error } = await supabaseAdmin.from("admin_push_subscriptions").upsert(
    {
      owner_id: owner,
      endpoint_hash: hash,
      encrypted_subscription: encryptSecret(JSON.stringify(subscription)),
      enabled: true,
      enabled_at: prior?.enabled ? prior.enabled_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_error_code: null,
    },
    { onConflict: "owner_id,endpoint_hash" },
  );
  if (error) throw Error("This device could not be registered.");
  if (focus) await savePushFocus(owner, subscription.endpoint, focus);
}
export async function savePushFocus(
  owner: string,
  endpoint: string,
  settings: FocusSettings,
) {
  if (!validFocusSettings(settings)) throw Error("Invalid timetable.");
  const normalized = {
    enabled: settings.enabled,
    override: settings.override,
    blocks: settings.blocks.map(({ days, start, end, space }) => ({
      days,
      start,
      end,
      space,
    })),
  };
  const hash = createHash("sha256")
    .update(JSON.stringify(normalized))
    .digest("hex");
  const { error } = await supabaseAdmin
    .from("admin_push_subscriptions")
    .update({
      focus_settings: normalized,
      focus_hash: hash,
      focus_updated_at: new Date().toISOString(),
    })
    .eq("owner_id", owner)
    .eq("endpoint_hash", endpointHash(endpoint))
    .eq("enabled", true)
    .or(`focus_hash.is.null,focus_hash.neq.${hash}`);
  if (error) throw Error("Schedule alerts could not be synced.");
}
export async function pushDevice(owner: string, endpoint: string) {
  const { data, error } = await supabaseAdmin
    .from("admin_push_subscriptions")
    .select(
      "id,owner_id,encrypted_subscription,enabled_at,enabled,last_error_code",
    )
    .eq("owner_id", owner)
    .eq("endpoint_hash", endpointHash(endpoint))
    .maybeSingle();
  if (error) throw Error("Device status is unavailable.");
  return data as (Device & { last_error_code: string | null }) | null;
}
export async function disablePushDevice(owner: string, endpoint: string) {
  const { error } = await supabaseAdmin
    .from("admin_push_subscriptions")
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq("owner_id", owner)
    .eq("endpoint_hash", endpointHash(endpoint));
  if (error) throw Error("This device could not be disabled. Please retry.");
}
export async function sendPush(
  device: Device,
  notice: { title: string; url: string; tag: string },
  options?: { ttl: number; focusHash: string | null },
) {
  await recordAdminNotice(
    device.owner_id,
    "push:" + notice.tag,
    notice.title,
    notice.url,
  );
  const { data: live, error: liveError } = await supabaseAdmin
    .from("admin_push_subscriptions")
    .select("enabled,focus_hash")
    .eq("id", device.id)
    .eq("owner_id", device.owner_id)
    .maybeSingle();
  if (liveError) throw Error("Device status is unavailable.");
  if (!live?.enabled || (options && live.focus_hash !== options.focusHash))
    return false;
  const subscription = pushSubscriptionSchema.parse(
    JSON.parse(decryptSecret(device.encrypted_subscription)),
  );
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify(notificationPayload(notice)),
      {
        vapidDetails: {
          subject: "https://whatelz.ai",
          publicKey: process.env.ADMIN_PUSH_PUBLIC_KEY!,
          privateKey: process.env.ADMIN_PUSH_PRIVATE_KEY!,
        },
        TTL: options?.ttl ?? 3600,
        urgency: "normal",
        timeout: 5000,
      },
    );
    const { error } = await supabaseAdmin
      .from("admin_push_subscriptions")
      .update({
        last_success_at: new Date().toISOString(),
        last_error_code: null,
      })
      .eq("id", device.id)
      .eq("owner_id", device.owner_id);
    if (error) throw Error("Delivery status could not be saved.");
    return true;
  } catch (error) {
    const code =
      error && typeof error === "object" && "statusCode" in error
        ? Number(error.statusCode)
        : 0;
    const expired = code === 404 || code === 410;
    const { error: writeError } = await supabaseAdmin
      .from("admin_push_subscriptions")
      .update({
        last_error_code: expired ? "expired" : "delivery_failed",
        ...(expired ? { enabled: false } : {}),
      })
      .eq("id", device.id)
      .eq("owner_id", device.owner_id);
    if (writeError) throw Error("Delivery status could not be saved.");
    return false;
  }
}
export async function sendTest(owner: string, endpoint: string) {
  const device = await pushDevice(owner, endpoint);
  if (!device?.enabled)
    throw Error("Enable notifications on this device first.");
  // Durable throttle across serverless instances, rather than a memory bucket.
  const { data, error } = await supabaseAdmin
    .from("admin_push_subscriptions")
    .update({ last_test_at: new Date().toISOString() })
    .eq("id", device.id)
    .eq("owner_id", owner)
    .or(
      `last_test_at.is.null,last_test_at.lt.${new Date(Date.now() - 60000).toISOString()}`,
    )
    .select("id")
    .maybeSingle();
  if (error) throw Error("Test notification is unavailable.");
  if (!data) throw Error("Wait a minute before sending another test.");
  if (
    !(await sendPush(device, {
      title: "Whatelz Admin is connected",
      url: "/settings",
      tag: "admin-push-test",
    }))
  )
    throw Error(
      "The push service did not accept the test. Check this device’s permission and try again.",
    );
}
export async function checkRoutinePush() {
  if (!pushConfigured()) throw Error("push_not_configured");
  const owner = process.env.WHATELZ_OWNER_USER_ID;
  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id,role")
    .eq("id", owner ?? "00000000-0000-0000-0000-000000000000")
    .maybeSingle();
  if (userError || !isOwnerUser(user)) throw Error("owner_unavailable");
  const { data, error } = await supabaseAdmin
    .from("admin_push_subscriptions")
    .select("id,owner_id,encrypted_subscription,enabled_at,enabled")
    .eq("owner_id", owner!)
    .eq("enabled", true)
    .limit(11);
  if (error || (data?.length ?? 0) > 10) throw Error("devices_unavailable");
  if (!data?.length) return { devices: 0, sent: 0 };
  let errorCode: string | null = null;
  let sent = 0;
  try {
    const connection = await emdeeConnection(owner!);
    if (connection?.parentPath !== DAILY_PARENT) throw Error("emdee_reconnect");
    for (const candidate of routineCandidates()) {
      // At most three canonical sources, with no AI calls or content in notifications.
      const { data: completed, error: completedError } = await supabaseAdmin
        .from("admin_push_deliveries")
        .select("subscription_id")
        .eq("document_path", candidate.path)
        .eq("status", "sent")
        .in(
          "subscription_id",
          data.map((d) => d.id),
        );
      if (completedError) throw Error("delivery_state_unavailable");
      const pending = (data as Device[]).filter(
        (d) => !completed?.some((c) => c.subscription_id === d.id),
      );
      if (!pending.length) continue;
      const doc = await readEmdee(connection, candidate.path);
      if (!doc) continue;
      for (const device of pending) {
        if (!savedRoutineReady(doc, device.enabled_at)) continue;
        const { data: claimed, error: claimError } = await supabaseAdmin.rpc(
          "claim_admin_push",
          {
            p_subscription: device.id,
            p_document: candidate.path,
            p_hash: doc.doc_content_hash,
          },
        );
        if (claimError) throw Error("delivery_claim_unavailable");
        if (!claimed) continue;
        const ok = await sendPush(device, candidate);
        const { error: updateError } = await supabaseAdmin
          .from("admin_push_deliveries")
          .update({
            status: ok ? "sent" : "failed",
            ...(ok ? { sent_at: new Date().toISOString() } : {}),
          })
          .eq("subscription_id", device.id)
          .eq("document_path", candidate.path);
        if (updateError) throw Error("delivery_state_unavailable");
        if (ok) sent++;
        else errorCode = "delivery_failed";
      }
    }
  } catch (error) {
    errorCode =
      error instanceof Error && error.message === "emdee_reconnect"
        ? "emdee_reconnect"
        : "check_failed";
  }
  const { error: stateError } = await supabaseAdmin
    .from("admin_push_state")
    .upsert({
      owner_id: owner!,
      checked_at: new Date().toISOString(),
      error_code: errorCode,
    });
  if (stateError) throw Error("monitor_state_unavailable");
  if (errorCode) throw Error(errorCode);
  return { devices: data.length, sent };
}

/** Runs independently of EMDEE, so a disconnected vault cannot block focus alerts. */
export async function checkFocusPush(now = new Date()) {
  if (!pushConfigured()) throw Error("push_not_configured");
  const owner = process.env.WHATELZ_OWNER_USER_ID;
  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id,role")
    .eq("id", owner ?? "00000000-0000-0000-0000-000000000000")
    .maybeSingle();
  if (userError || !isOwnerUser(user)) throw Error("owner_unavailable");
  const { data, error } = await supabaseAdmin
    .from("admin_push_subscriptions")
    .select(
      "id,owner_id,encrypted_subscription,enabled_at,enabled,focus_settings,focus_hash,focus_updated_at",
    )
    .eq("owner_id", owner!)
    .eq("enabled", true)
    .limit(11);
  if (error || (data?.length ?? 0) > 10) throw Error("devices_unavailable");
  let sent = 0;
  let failed = false;
  for (const device of (data ?? []) as Device[]) {
    const since = new Date(
      Math.max(
        Date.parse(device.enabled_at),
        Date.parse(device.focus_updated_at ?? device.enabled_at),
      ),
    ).toISOString();
    const candidate = focusPushCandidate(now, device.focus_settings, since);
    if (!candidate) continue;
    const { data: claimed, error: claimError } = await supabaseAdmin.rpc(
      "claim_admin_push",
      {
        p_subscription: device.id,
        p_document: candidate.path,
        p_hash:
          device.focus_hash ??
          createHash("sha256")
            .update(JSON.stringify(DEFAULT_FOCUS))
            .digest("hex"),
      },
    );
    if (claimError) throw Error("delivery_claim_unavailable");
    if (!claimed) continue;
    const ok = await sendPush(device, candidate, {
      ttl: Math.max(
        1,
        Math.min(60, Math.floor((candidate.endsAt - now.getTime()) / 1000)),
      ),
      focusHash: device.focus_hash ?? null,
    });
    const { error: updateError } = await supabaseAdmin
      .from("admin_push_deliveries")
      .update({
        status: ok ? "sent" : "failed",
        ...(ok ? { sent_at: new Date().toISOString() } : {}),
      })
      .eq("subscription_id", device.id)
      .eq("document_path", candidate.path);
    if (updateError) throw Error("delivery_state_unavailable");
    if (ok) sent++;
    else failed = true;
  }
  if (failed) throw Error("focus_delivery_failed");
  return { devices: data?.length ?? 0, sent };
}
