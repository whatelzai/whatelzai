"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dailyOwner } from "@/lib/daily/server";
import { beginEmdeeConnection } from "@/lib/daily/oauth";
import { storeConnection } from "@/lib/daily/connections";
import { supabaseAdmin } from "@/lib/supabase-server";
import type { ActionResult } from "@/lib/daily/model";
export async function connectEmdee(
  _state: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const owner = await dailyOwner();
  let destination: string;
  try {
    destination = await beginEmdeeConnection(
      owner,
      String(form.get("parent_path") ?? ""),
    );
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Connection could not start.",
    };
  }
  redirect(destination);
}
export async function connectOpenAI(
  _state: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const owner = await dailyOwner();
  const parsed = z
    .object({
      key: z.string().trim().min(20).max(500),
      model: z
        .string()
        .trim()
        .regex(/^[a-zA-Z0-9._:-]{1,120}$/),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error: "Enter your OpenAI API key and the model ID you want to use.",
    };
  // Validate credentials and model access without sending notes or spending tokens.
  try {
    const check = await fetch(
      `https://api.openai.com/v1/models/${encodeURIComponent(parsed.data.model)}`,
      {
        headers: { Authorization: `Bearer ${parsed.data.key}` },
        redirect: "error",
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      },
    );
    if (!check.ok)
      return {
        error:
          "OpenAI could not verify this key's access to that model. Check both values.",
      };
    await storeConnection(owner, "openai", parsed.data);
  } catch {
    return { error: "The OpenAI connection could not be verified or saved." };
  }
  revalidatePath("/admin/today");
  return {
    success: "OpenAI connection saved. Your API key is never displayed again.",
  };
}
export async function disconnectProvider(
  _state: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const owner = await dailyOwner();
  const provider = z.enum(["emdee", "openai"]).safeParse(form.get("provider"));
  if (!provider.success) return { error: "Choose a connection." };
  const { error } = await supabaseAdmin
    .from("daily_connections")
    .delete()
    .eq("owner_id", owner)
    .in(
      "provider",
      provider.data === "emdee" ? ["emdee", "emdee-pkce"] : ["openai"],
    );
  if (error) return { error: "The connection could not be disconnected." };
  revalidatePath("/admin/today");
  return {
    success:
      "Stored connection removed. Revoke the credential at its provider too if you no longer need it.",
  };
}
