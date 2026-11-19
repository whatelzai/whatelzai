import { validFocusSettings } from "@/lib/admin-focus";
import { ensureUserRow } from "@/lib/users";
import { isOwnerUser } from "@/lib/admin-policy";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
  pushSubscriptionSchema,
  trustedPushEndpoint,
} from "@/lib/admin-push/model";
import {
  disablePushDevice,
  pushConfigured,
  pushDevice,
  savePushDevice,
  sendTest,
  savePushFocus,
} from "@/lib/admin-push/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const reply = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
function adminHost(request: Request) {
  const host = new URL(request.url).hostname;
  return (
    host === "admin.whatelz.ai" ||
    (process.env.VERCEL_ENV !== "production" &&
      (host === "localhost" ||
        host === "admin.localhost" ||
        host.endsWith(".vercel.app")))
  );
}
async function owner() {
  const user = await ensureUserRow();
  return isOwnerUser(user) ? user!.id : null;
}
export async function GET(request: Request) {
  if (!adminHost(request)) return reply({ error: "Admin host required." }, 403);
  const id = await owner();
  if (!id) return reply({ error: "Owner access required." }, 403);
  const { data, error } = await supabaseAdmin
    .from("admin_push_state")
    .select("checked_at,error_code")
    .eq("owner_id", id)
    .maybeSingle();
  if (error)
    return reply({ error: "Notification status is unavailable." }, 503);
  return reply({
    configured: pushConfigured(),
    publicKey: process.env.ADMIN_PUSH_PUBLIC_KEY || null,
    monitor: data,
  });
}
export async function POST(request: Request) {
  if (!adminHost(request)) return reply({ error: "Admin host required." }, 403);
  const url = new URL(request.url);
  if (
    request.headers.get("origin") !== url.origin ||
    !request.headers.get("content-type")?.startsWith("application/json")
  )
    return reply({ error: "Same-origin request required." }, 403);
  const id = await owner();
  if (!id) return reply({ error: "Owner access required." }, 403);
  if (Number(request.headers.get("content-length") || 0) > 8192)
    return reply({ error: "Request too large." }, 413);
  const raw = await request.text();
  if (raw.length > 8192) return reply({ error: "Request too large." }, 413);
  let input: {
    action?: string;
    subscription?: unknown;
    endpoint?: string;
    focus?: unknown;
  };
  try {
    input = JSON.parse(raw);
  } catch {
    return reply({ error: "Invalid request." }, 400);
  }
  if (
    !input ||
    !["status", "subscribe", "unsubscribe", "test", "focus"].includes(
      input.action || "",
    )
  )
    return reply({ error: "Invalid action." }, 400);
  try {
    if (input.action === "subscribe") {
      if (!pushConfigured())
        return reply({ error: "Notifications are not configured yet." }, 503);
      const parsed = pushSubscriptionSchema.safeParse(input.subscription);
      if (!parsed.success)
        return reply({ error: "Invalid push subscription." }, 400);
      if (input.focus !== undefined && !validFocusSettings(input.focus))
        return reply({ error: "Invalid timetable." }, 400);
      await savePushDevice(
        id,
        parsed.data,
        validFocusSettings(input.focus) ? input.focus : undefined,
      );
      return reply({ enabled: true });
    }
    if (
      typeof input.endpoint !== "string" ||
      !trustedPushEndpoint(input.endpoint)
    )
      return reply({ error: "Invalid push endpoint." }, 400);
    if (input.action === "focus") {
      if (!validFocusSettings(input.focus))
        return reply({ error: "Invalid timetable." }, 400);
      const device = await pushDevice(id, input.endpoint);
      if (!device?.enabled) return reply({ synced: false });
      await savePushFocus(id, input.endpoint, input.focus);
      return reply({ synced: true });
    }
    if (input.action === "status") {
      const device = await pushDevice(id, input.endpoint);
      return reply({
        enabled: device?.enabled ?? false,
        errorCode: device?.last_error_code ?? null,
      });
    }
    if (input.action === "unsubscribe") {
      await disablePushDevice(id, input.endpoint);
      return reply({ enabled: false });
    }
    if (!pushConfigured())
      return reply({ error: "Notifications are not configured yet." }, 503);
    await sendTest(id, input.endpoint);
    return reply({ accepted: true });
  } catch (error) {
    return reply(
      {
        error:
          error instanceof Error
            ? error.message
            : "Notifications are unavailable.",
      },
      503,
    );
  }
}
