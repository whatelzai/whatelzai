import { createHash } from "node:crypto";
import { z } from "zod";
import {
  memberActor,
  memberApiEnabled,
  platformKey,
} from "@/lib/member-ai/server";
import { memberOriginAllowed } from "@/lib/member-ai/http";
import { limitedForm, wavSamples } from "@/lib/member-ai/media";
import { supabaseAdmin } from "@/lib/supabase-server";
export const maxDuration = 90;
export async function POST(request: Request) {
  const json = (value: unknown, status = 200) =>
    Response.json(value, {
      status,
      headers: { "Cache-Control": "private, no-store" },
    });
  if (!memberOriginAllowed(request) || !memberApiEnabled())
    return json({ error: "Open Chat on app.whatelz.ai." }, 403);
  let user: string, key: string, bytes: Uint8Array, id: string, samples: number;
  try {
    user = (await memberActor()).user.id;
    key = await platformKey();
    const form = await limitedForm(request, 2_000_000);
    const file = form.get("audio");
    id = z.uuid().parse(form.get("requestId"));
    if (!(file instanceof File)) throw Error("Recording missing");
    bytes = new Uint8Array(await file.arrayBuffer());
    samples = wavSamples(bytes);
  } catch {
    return json(
      { error: "Choose a recording of up to one minute while signed in." },
      400,
    );
  }
  const reservation = await supabaseAdmin.rpc("reserve_member_dictation", {
    p_user: user,
    p_id: id,
    p_hash: createHash("sha256").update(bytes).digest("hex"),
    p_samples: samples,
  });
  if (reservation.error)
    return json(
      {
        error: reservation.error.message.includes("allowance")
          ? "AI allowance reached."
          : "Recording could not start. Wait for your previous recording or reload.",
      },
      409,
    );
  if (reservation.data?.duplicate) {
    if (reservation.data.status === "completed")
      return json({ text: reservation.data.text });
    return json(
      {
        error:
          "This recording is still processing or its outcome is uncertain. Check Usage before trying another recording.",
      },
      409,
    );
  }
  let text = "",
    failure = "",
    uncertain = false;
  try {
    const form = new FormData();
    form.set("model", "gpt-transcribe");
    form.set(
      "file",
      new Blob([bytes.buffer as ArrayBuffer], { type: "audio/wav" }),
      "recording.wav",
    );
    uncertain = true;
    const result = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: form,
        signal: AbortSignal.timeout(60000),
        redirect: "error",
      },
    );
    if (!result.ok) {
      if (result.status >= 400 && result.status < 500) uncertain = false;
      throw Error("Transcription could not finish.");
    }
    const data = await result.json();
    text = z.string().max(12000).parse(data.text);
    uncertain = false;
  } catch {
    failure = "Your recording could not be transcribed.";
  }
  const saved = await supabaseAdmin.rpc("finish_member_dictation", {
    p_user: user,
    p_id: id,
    p_text: text,
    p_failed: Boolean(failure),
    p_uncertain: uncertain,
  });
  if (saved.error)
    return json(
      {
        error:
          "Recording outcome could not be saved. Reload and check Usage before trying again.",
      },
      503,
    );
  if (failure)
    return json(
      {
        error:
          failure +
          (uncertain
            ? " Its allowance remains reserved because processing could not be confirmed."
            : ""),
      },
      502,
    );
  return json({ text });
}
