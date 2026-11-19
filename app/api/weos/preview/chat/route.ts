import { after } from "next/server";
import { randomUUID } from "node:crypto";
import { weosAccess } from "@/lib/weos-role-server";
import { isOwnerUser } from "@/lib/admin-policy";
import { memberOriginAllowed } from "@/lib/member-ai/http";
import { memberApiEnabled, platformKey } from "@/lib/member-ai/server";
import { sendSchema, modelSchema, reserveCost } from "@/lib/member-ai/model";
import { supabaseAdmin } from "@/lib/supabase-server";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { readScopedResource } from "@/lib/fcos/resources";
import { roleSourceAllowed } from "@/lib/weos-roles";
import { runMemberAgent, type Receipt } from "@/lib/member-ai/agent";
import { createReplyStream } from "@/lib/member-ai/reply-stream";
import { singaporeDay } from "@/lib/daily/model";
export const maxDuration = 180;
export async function POST(request: Request) {
  const json = (value: unknown, status = 200) =>
    Response.json(value, {
      status,
      headers: { "Cache-Control": "private, no-store" },
    });
  if (!memberOriginAllowed(request))
    return json({ error: "Open role testing in weOS." }, 403);
  const access = await weosAccess();
  if (
    !isOwnerUser(access.user) ||
    access.actual !== "beacon" ||
    !access.preview
  )
    return json({ error: "Select a role in Beacon’s Profile first." }, 403);
  if (!memberApiEnabled()) return json({ error: "Member AI is paused." }, 503);
  if (Number(request.headers.get("content-length") ?? 0) > 30000)
    return json({ error: "Message too long." }, 413);
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 30000)
    return json({ error: "Message too long." }, 413);
  const parsed = sendSchema.safeParse(
    (() => {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    })(),
  );
  if (!parsed.success || parsed.data.imageIds.length)
    return json(
      { error: "Enter a text message of up to 6,000 characters." },
      400,
    );
  const { requestId, conversationId, text } = parsed.data;
  const userId = access.user!.id,
    role = access.role;
  const enrollment = await supabaseAdmin.rpc("ensure_activated_member_ai", {
    p_user: userId,
  });
  if (enrollment.error || !enrollment.data?.active)
    return json({ error: "AI allowance unavailable." }, 503);
  const model = modelSchema.parse(enrollment.data.model);
  let key: string;
  try {
    key = await platformKey();
  } catch {
    return json({ error: "AI service is not configured." }, 503);
  }
  const reservation = reserveCost(model);
  const held = await supabaseAdmin.rpc("reserve_weos_preview", {
    p_user: userId,
    p_request: requestId,
    p_conversation: conversationId,
    p_role: role,
    p_text: text,
    p_reserve: reservation,
    p_model: model,
  });
  if (held.error) {
    const allowed = [
      "Hourly message limit reached",
      "AI allowance reached",
      "A reply is already being prepared",
      "Start a new conversation to continue",
    ];
    return json(
      {
        error: allowed.includes(held.error.message)
          ? held.error.message
          : "Start a new role test and try again.",
      },
      409,
    );
  }
  if (held.data?.duplicate)
    return json({ duplicate: true, status: held.data.status });
  // This authenticated RPC lowers SQL permissions; it never retrieves as Beacon.
  const db = await createAuthClient();
  const read = async (
    source: string,
    query: string,
  ): Promise<Record<string, unknown>> => {
    if (!roleSourceAllowed(role, source))
      return { unavailable: true, reason: "Source unavailable for this role." };
    const result = await db.rpc("weos_preview_context", {
      p_role: role,
      p_source: source,
      p_query: query,
    });
    if (result.error)
      throw Error("Context is unavailable for the selected role.");
    if (
      !result.data ||
      typeof result.data !== "object" ||
      Array.isArray(result.data)
    )
      throw Error("Context unavailable");
    return result.data;
  };
  async function prepare(onText?: (text: string) => void) {
    const receipt: Receipt = {
      input: 0,
      output: 0,
      charge: 0,
      uncertain: false,
    };
    let result: Awaited<ReturnType<typeof runMemberAgent>> | null = null,
      failure = "";
    try {
      const conversation = await db
        .from("member_ai_conversations")
        .select("id")
        .eq("id", conversationId)
        .eq("user_id", userId)
        .eq("preview_role", role)
        .maybeSingle();
      if (conversation.error || !conversation.data)
        throw Error("Role test unavailable.");
      const history = await db
        .from("member_ai_messages")
        .select("id,role,body,proposals")
        .eq("user_id", userId)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (history.error) throw Error("Role test history unavailable.");
      result = await runMemberAgent({
        role,
        key,
        model,
        day: singaporeDay(),
        history: history.data.reverse(),
        receipt,
        onText,
        readFcos: (input) => readScopedResource(input, read),
        readVault: async () => ({
          unavailable: true,
          reason: "Connected owner vaults are excluded from role tests.",
        }),
        readCommitments: async () => ({
          unavailable: true,
          reason: "Private owner workspaces are excluded from role tests.",
        }),
      });
      if (receipt.charge > reservation) {
        receipt.uncertain = true;
        throw Error("Usage could not be reconciled.");
      }
    } catch {
      failure =
        "This role test could not finish. Start a new test before retrying.";
    }
    const settled = await supabaseAdmin.rpc("finish_member_ai", {
      p_user: userId,
      p_request: requestId,
      p_body: result?.body ?? "",
      p_charge: Math.min(receipt.charge, reservation),
      p_input: receipt.input,
      p_output: receipt.output,
      p_failed: !!failure,
      p_uncertain: receipt.uncertain,
      p_proposals: [],
    });
    if (settled.error)
      return json(
        { error: "Reply could not be saved; its allowance remains reserved." },
        503,
      );
    if (failure)
      return json(
        {
          error:
            failure +
            (receipt.uncertain
              ? " Its maximum allowance remains reserved because provider usage is uncertain."
              : ""),
        },
        502,
      );
    return json({
      message: {
        id: randomUUID(),
        role: "assistant",
        body: result!.body,
        proposals: [],
      },
    });
  }
  const stream = createReplyStream(prepare);
  after(stream.finished);
  return stream.response;
}
