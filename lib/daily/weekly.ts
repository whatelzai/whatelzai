import "server-only";
import { supabaseAdmin } from "@/lib/supabase-server";
import { isOwnerUser } from "@/lib/admin-policy";
import { emdeeConnection, openaiConnection } from "./connections";
import { emdeeCall, readEmdee, type Envelope } from "./emdee-client";
import { briefPath } from "./model";
import { branchParent, DAILY_PARENT, DAILY_TITLE } from "./paths";
import { previousWeek, type WeeklySource } from "./weekly-model";
import { generateWeeklyDraft } from "./agent";
import { apiGenerationEnabled } from "./settings";

type Run = {
  status: "running" | "completed" | "failed" | "empty";
  attempts: number;
  started_at: string;
  document_path: string | null;
  source_count: number | null;
  error_code: string | null;
};
export async function weeklyStatus(
  owner: string,
  now = new Date(),
): Promise<Run | null> {
  const { data, error } = await supabaseAdmin
    .from("daily_weekly_runs")
    .select(
      "status, attempts, started_at, document_path, source_count, error_code",
    )
    .eq("owner_id", owner)
    .eq("week_start", previousWeek(now).start)
    .maybeSingle();
  if (error) throw new Error("Weekly status is unavailable.");
  return data;
}
export async function runWeekly(
  owner: string,
  now = new Date(),
  retry = false,
) {
  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, role")
    .eq("id", owner)
    .maybeSingle();
  if (userError || !isOwnerUser(user))
    throw new Error("Owner access required.");
  if (!apiGenerationEnabled()) return "disabled";
  const week = previousWeek(now);
  const prior = await weeklyStatus(owner, now);
  if (prior?.status === "completed" || prior?.status === "empty")
    return prior.status;
  if (
    prior &&
    (!retry ||
      prior.attempts >= 3 ||
      (prior.status === "running" &&
        now.getTime() - Date.parse(prior.started_at) < 600000))
  )
    return prior.status;
  const attempt = (prior?.attempts ?? 0) + 1;
  const values = {
    status: "running",
    attempts: attempt,
    started_at: now.toISOString(),
    finished_at: null,
    error_code: null,
  };
  if (prior) {
    const { data, error } = await supabaseAdmin
      .from("daily_weekly_runs")
      .update(values)
      .eq("owner_id", owner)
      .eq("week_start", week.start)
      .eq("attempts", prior.attempts)
      .eq("status", prior.status)
      .eq("started_at", prior.started_at)
      .select("attempts")
      .maybeSingle();
    if (error) throw new Error("Weekly run could not be reserved.");
    if (!data) return "running";
  } else {
    const { error } = await supabaseAdmin
      .from("daily_weekly_runs")
      .insert({ ...values, owner_id: owner, week_start: week.start });
    if (error?.code === "23505") return "running";
    if (error) throw new Error("Weekly run could not be reserved.");
  }
  async function finish(
    status: "completed" | "failed" | "empty",
    fields: Record<string, unknown> = {},
  ) {
    const { error } = await supabaseAdmin
      .from("daily_weekly_runs")
      .update({ status, ...fields, finished_at: new Date().toISOString() })
      .eq("owner_id", owner)
      .eq("week_start", week.start)
      .eq("attempts", attempt)
      .eq("status", "running");
    if (error) throw new Error("Weekly run status could not be saved.");
    return status;
  }
  let stage = "connection";
  try {
    const connection = await emdeeConnection(owner);
    if (!connection || connection.parentPath !== DAILY_PARENT)
      throw new Error("Reconnect EMDEE to Personal Daily.");
    // Recover a previous successful write after an interrupted database update.
    const existing = await readEmdee(connection, week.path);
    if (existing)
      return await finish("completed", { document_path: week.path });
    stage = "sources";
    const entries = await Promise.all(
      week.days.flatMap((day) =>
        (["morning", "evening"] as const).map(async (kind) => {
          const path = briefPath(DAILY_PARENT, day, kind);
          const doc = await readEmdee(connection, path);
          if (!doc) return null;
          const body =
            doc.content
              ?.split(/^## Notes\s*$/m)[1]
              ?.split(/^## /m)[0]
              ?.trim() ?? "";
          if (!body)
            throw new Error("A daily entry has no readable Notes section.");
          return {
            day,
            kind,
            path,
            title: doc.content!.split("\n")[0].replace(/^# /, ""),
            hash: doc.doc_content_hash,
            body,
          } satisfies WeeklySource;
        }),
      ),
    );
    const sources = entries.filter((e): e is WeeklySource => e !== null);
    if (!sources.length) return await finish("empty", { source_count: 0 });
    const missing = week.days.flatMap((day) =>
      (["morning", "evening"] as const)
        .filter(
          (kind) => !sources.some((s) => s.day === day && s.kind === kind),
        )
        .map((kind) => `${day} ${kind}`),
    );
    stage = "generation";
    const ai = await openaiConnection(owner);
    if (!ai) throw new Error("Connect OpenAI.");
    const draft = await generateWeeklyDraft(ai, {
      week: week.id,
      start: week.start,
      end: week.end,
      sources,
      missing,
    });
    stage = "sources";
    await Promise.all(
      sources.map(async (source) => {
        const latest = await emdeeCall<Envelope>(connection, "get_doc", {
          path: source.path,
        });
        if (latest.doc_content_hash !== source.hash)
          throw new Error("Source changed while summarizing.");
      }),
    );
    stage = "publication";
    const parent = branchParent(DAILY_PARENT, "weeks");
    const hub = await emdeeCall<Envelope>(connection, "get_doc", {
      path: parent,
    });
    const body = `${draft.body}\n\n### Coverage\n\n${sources.length}/14 entries available for ${week.start} to ${week.end}, Asia/Singapore.\n\n${missing.length ? "Missing: " + missing.join(", ") : "All morning and evening entries available."}\n\n### Source records\n\n${sources.map((s) => `- [[${s.title}]] — ${s.path} · ${s.hash}`).join("\n")}\n\nAI-generated weekly synthesis. Original daily entries retained; no operational commitments changed. — whatelz-daily`;
    await emdeeCall(connection, "create_child", {
      parent_path: parent,
      child_path: week.path,
      title: `${DAILY_TITLE} — 03-WEEKS — WEEK-${week.id}`,
      summary: `Weekly reflection for ${week.start} through ${week.end}, Asia/Singapore.`,
      body,
      expected_parent_content_hash: hub.doc_content_hash,
      no_auto_hash: true,
      author: "whatelz-daily",
    });
    const saved = await readEmdee(connection, week.path);
    if (saved?.content?.split(/^## Notes\s*$/m)[1]?.trim() !== body.trim())
      throw new Error("Weekly write needs verification.");
    return await finish("completed", {
      document_path: week.path,
      source_count: sources.length,
    });
  } catch {
    await finish("failed", { error_code: stage });
    throw new Error(
      `Weekly summary needs attention (${stage}). Check Connections or retry from Today. Original entries are safe.`,
    );
  }
}
