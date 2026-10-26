import { titleConversation } from "@/lib/member-ai/title-server";
import { modelChatImages } from "@/lib/member-ai/images";
import { after } from "next/server";
import { createReplyStream } from "@/lib/member-ai/reply-stream";
import { readFcosResource } from "@/lib/fcos/resources";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
  memberActor,
  memberApiEnabled,
  platformKey,
  conversationMessages,
} from "@/lib/member-ai/server";
import { memberOriginAllowed } from "@/lib/member-ai/http";
import { sendSchema, reserveCost } from "@/lib/member-ai/model";
import { runMemberAgent, type Receipt } from "@/lib/member-ai/agent";
import { singaporeDay } from "@/lib/daily/model";
import { readMemberVault } from "@/lib/member-ai/emdee";
export const maxDuration = 180;
export async function POST(request: Request) {
  const json = (value: unknown, status = 200) =>
    Response.json(value, {
      status,
      headers: { "Cache-Control": "private, no-store" },
    });
  if (!memberOriginAllowed(request))
    return json({ error: "Open the assistant on app.whatelz.ai." }, 403);
  if (!memberApiEnabled()) return json({ error: "Member AI is paused." }, 503);
  if (Number(request.headers.get("content-length") ?? 0) > 30000)
    return json({ error: "Message too long." }, 413);
  let actor: Awaited<ReturnType<typeof memberActor>>;
  try {
    actor = await memberActor();
  } catch {
    return json(
      { error: "Sign in with a tree-activated member account." },
      403,
    );
  }
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
  if (!parsed.success)
    return json({ error: "Enter a message of up to 6,000 characters." }, 400);
  const { requestId, conversationId, text, imageIds } = parsed.data;
  const model = actor.access.model;
  // Check provider readiness before reserving member funds.
  let key: string;
  try {
    key = await platformKey();
  } catch {
    return json({ error: "AI service is not configured." }, 503);
  }
  let images: Awaited<ReturnType<typeof modelChatImages>>;
  try {
    images = await modelChatImages(
      actor.user.id,
      conversationId,
      imageIds,
      requestId,
    );
  } catch {
    return json({ error: "Chat images could not be loaded." }, 503);
  }
  const reservation = reserveCost(model, images.length);
  const held = await supabaseAdmin.rpc("reserve_member_ai_images", {
    p_user: actor.user.id,
    p_request: requestId,
    p_conversation: conversationId,
    p_text: text,
    p_reserve: reservation,
    p_model: model,
    p_images: imageIds,
  });
  if (held.error) {
    const reason = held.error.message;
    const allowed = [
      "Hourly message limit reached",
      "AI allowance reached",
      "A reply is already being prepared",
      "Start a new conversation to continue",
      "Model changed. Retry",
    ];
    return json(
      {
        error: allowed.includes(reason)
          ? reason
          : "This conversation could not start. Reload and try again.",
      },
      409,
    );
  }
  if (held.data?.duplicate)
    return json({ duplicate: true, status: held.data.status });
  async function prepare(onText?: (text: string) => void) {
    const receipt: Receipt = {
      input: 0,
      output: 0,
      charge: 0,
      uncertain: false,
    };
    let result: Awaited<ReturnType<typeof runMemberAgent>> | null = null;
    let failure = "";
    try {
      result = await runMemberAgent({
        key,
        model,
        onText,
        day: singaporeDay(),
        history: await conversationMessages(actor.user.id, conversationId),
        receipt,
        images,
        readFcos: readFcosResource,
        readVault: (path) => readMemberVault(actor.user.id, path),
        readCommitments: async () => {
          const tasks = await supabaseAdmin
            .from("daily_tasks")
            .select("title,lane,due_on,status")
            .eq("owner_id", actor.user.id)
            .not("status", "in", "(done,dropped)")
            .order("due_on")
            .limit(20);
          if (tasks.error) throw Error("Commitments are unavailable.");
          return {
            items: tasks.data,
            limit: 20,
            coverage:
              "Earliest unfinished commitments only. Completion must be confirmed by the member.",
          };
        },
      });
      if (receipt.charge > reservation) {
        receipt.uncertain = true;
        throw Error("Usage could not be reconciled. Contact Edmund.");
      }
    } catch (error) {
      failure =
        error instanceof Error
          ? error.message
          : "The reply could not be prepared.";
    }
    const settled = await supabaseAdmin.rpc("finish_member_ai", {
      p_user: actor.user.id,
      p_request: requestId,
      p_body: result?.body ?? "",
      p_charge: Math.min(receipt.charge, reservation),
      p_input: receipt.input,
      p_output: receipt.output,
      p_failed: !!failure,
      p_uncertain: receipt.uncertain,
      p_proposals: result?.proposals ?? [],
    });
    if (settled.error)
      return json(
        {
          error:
            "Reply could not be saved. Its allowance remains reserved; reload before retrying.",
        },
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
    after(() =>
      titleConversation(actor.user.id, conversationId, key).catch(() => {}),
    );
    return json({
      message: {
        id: randomUUID(),
        role: "assistant",
        body: result!.body,
        proposals: result!.proposals,
      },
    });
  }
  if (request.headers.get("accept")?.includes("application/x-ndjson")) {
    const stream = createReplyStream(prepare);
    after(stream.finished);
    return stream.response;
  }
  return prepare();
}
