"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-server";
import { dailyOwner, loadDailyTasks } from "@/lib/daily/server";
import { apiGenerationEnabled } from "@/lib/daily/settings";
import {
  briefSchema,
  taskSchema,
  taskChangeSchema,
  singaporeDay,
  previousDay,
  type ActionResult,
} from "@/lib/daily/model";
import { loadBrief, saveBrief } from "@/lib/daily/emdee";
import { openaiConnection } from "@/lib/daily/connections";
import { generateDailyDraft } from "@/lib/daily/agent";

export async function addTask(
  _state: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const owner = await dailyOwner();
  const parsed = taskSchema
    .extend({ id: z.uuid() })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { error: "Enter a commitment, a lane and a valid date." };
  const { error } = await supabaseAdmin
    .from("daily_tasks")
    .upsert(
      { ...parsed.data, owner_id: owner },
      { onConflict: "id", ignoreDuplicates: true },
    );
  if (error)
    return { error: "This commitment could not be saved. Please try again." };
  revalidatePath("/admin/today");
  return { success: "Proposal saved. Accept it when you are ready to commit." };
}
export async function changeTask(
  _state: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const owner = await dailyOwner();
  const parsed = taskChangeSchema
    .extend({ due_on: z.iso.date() })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { error: "Check the commitment status and date." };
  const { id, revision, status, due_on } = parsed.data;
  const current = await supabaseAdmin
    .from("daily_tasks")
    .select("accepted_on")
    .eq("owner_id", owner)
    .eq("id", id)
    .eq("revision", revision)
    .maybeSingle();
  if (current.error || !current.data)
    return { error: "This commitment changed. Reload before updating it." };
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("daily_tasks")
    .update({
      status,
      due_on,
      accepted_on:
        status === "open"
          ? (current.data.accepted_on ?? singaporeDay())
          : current.data.accepted_on,
      completed_at: status === "done" ? now : null,
      completed_on: status === "done" ? singaporeDay() : null,
      revision: revision + 1,
      updated_at: now,
    })
    .eq("owner_id", owner)
    .eq("id", id)
    .eq("revision", revision)
    .select("id")
    .maybeSingle();
  if (error || !data)
    return {
      error:
        "This commitment changed or could not be updated. Reload and try again.",
    };
  revalidatePath("/admin/today");
  return { success: "Commitment updated." };
}
export async function saveDocument(
  _state: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const owner = await dailyOwner();
  const parsed = briefSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success || /^#{1,2}\s/m.test(parsed.data.body))
    return {
      error: "Write a brief using plain text or headings starting with ###.",
    };
  try {
    const { day, kind, body, hash } = parsed.data;
    const saved = await saveBrief(day, kind, body, hash);
    const { error } = await supabaseAdmin.from("daily_documents").upsert({
      owner_id: owner,
      day,
      kind,
      document_path: saved.path,
      section_hash: saved.hash,
      updated_at: new Date().toISOString(),
    });
    revalidatePath("/admin/today");
    if (error)
      return {
        error:
          "Your brief was saved in EMDEE, but its dashboard reference could not be updated. Reload before saving again.",
      };
    return { success: "Saved and verified in EMDEE." };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "The brief could not be saved.",
    };
  }
}
export async function prepareDraft(
  input: unknown,
): Promise<ActionResult & { body?: string }> {
  const owner = await dailyOwner();
  const parsed = z
    .object({
      day: z.iso.date(),
      kind: z.enum(["morning", "evening"]),
      notes: z.string().max(8000),
    })
    .safeParse(input);
  if (!parsed.success || parsed.data.day !== singaporeDay())
    return {
      error: "AI preparation is available for today only. Reload the page.",
    };
  if (!apiGenerationEnabled())
    return {
      error:
        "API generation is disabled. Your ChatGPT daily tasks write directly to EMDEE.",
    };
  const connection = await openaiConnection(owner);
  if (!connection)
    return {
      error:
        "AI preparation is not connected yet. You can still write and save your brief.",
    };
  const { day, kind, notes } = parsed.data;
  // Unique slots cap calls atomically across tabs/instances. Failures consume a slot.
  let run: string | undefined;
  for (let slot = 1; slot <= 3; slot++) {
    const reserved = await supabaseAdmin
      .from("daily_runs")
      .insert({ owner_id: owner, day, kind, slot, model: connection.model })
      .select("id")
      .single();
    if (reserved.data) {
      run = reserved.data.id;
      break;
    }
    if (reserved.error?.code !== "23505")
      return {
        error: "AI preparation could not start. Please try again later.",
      };
  }
  if (!run)
    return {
      error:
        "Today's three preparation attempts for this brief have been used. You can still write it yourself.",
    };
  try {
    const [tasks, previous] = await Promise.all([
      loadDailyTasks(day),
      loadBrief(previousDay(day), "evening"),
    ]);
    const result = await generateDailyDraft(connection, {
      day,
      kind,
      tasks,
      previousCloseout: previous.exists ? previous.body : null,
      notes,
    });
    const { error } = await supabaseAdmin
      .from("daily_runs")
      .update({
        status: "drafted",
        input_tokens: result.usage?.input_tokens,
        output_tokens: result.usage?.output_tokens,
        finished_at: new Date().toISOString(),
      })
      .eq("owner_id", owner)
      .eq("id", run);
    if (error)
      return {
        body: result.body,
        error:
          "Draft prepared, but run history could not be updated. Review it before saving.",
      };
    revalidatePath("/admin/today");
    return {
      body: result.body,
      success:
        "Draft prepared. Review it, then save to EMDEE. Commitments remain unchanged.",
    };
  } catch (err) {
    await supabaseAdmin
      .from("daily_runs")
      .update({ status: "failed", finished_at: new Date().toISOString() })
      .eq("owner_id", owner)
      .eq("id", run);
    return {
      error: err instanceof Error ? err.message : "AI preparation failed.",
    };
  }
}
