// Run only for the explicitly authorized immutable application user ID.
// This script never prints prompts, generated titles, IDs or credentials.
import { createClient } from "@supabase/supabase-js";
import { createDecipheriv } from "node:crypto";
import { runTitleJob } from "../lib/member-ai/title-job";
async function main() {
  const owner = process.env.TITLE_BACKFILL_OWNER_ID;
  if (!owner || !/^[0-9a-f-]{36}$/i.test(owner))
    throw Error("Set the authorized owner ID in a private environment file");
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const rows = await db
    .from("member_ai_conversations")
    .select("id,title")
    .eq("user_id", owner)
    .like("title", "Conversation · %")
    .order("created_at")
    .order("id")
    .limit(101);
  if (rows.error || !rows.data || rows.data.length > 100)
    throw Error(
      "Backfill scope unavailable or exceeds the 100-conversation cap",
    );
  const account = await db
    .from("users")
    .select("role")
    .eq("id", owner)
    .single();
  if (account.error || !["admin", "superadmin"].includes(account.data.role))
    throw Error("Configured owner verification failed");
  const connection = await db
    .from("daily_connections")
    .select("encrypted_credentials")
    .eq("owner_id", owner)
    .eq("provider", "openai")
    .single();
  if (connection.error) throw Error("Existing provider connection unavailable");
  const [iv, ciphertext, tag] =
    connection.data.encrypted_credentials.split(":");
  const cipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(process.env.DAILY_INTEGRATION_KEY!, "hex"),
    Buffer.from(iv, "hex"),
  );
  cipher.setAuthTag(Buffer.from(tag, "hex"));
  const key = JSON.parse(
    cipher.update(ciphertext, "hex", "utf8") + cipher.final("utf8"),
  ).key;
  if (!key) throw Error("Existing provider connection unavailable");
  const counts: Record<string, number> = {};
  for (const row of rows.data) {
    const result = await runTitleJob(db, owner, row.id, key);
    counts[result] = (counts[result] ?? 0) + 1;
  }
  const jobs = await db
    .from("member_ai_title_jobs")
    .select("conversation_id,status,charge_micro")
    .eq("user_id", owner);
  if (jobs.error) throw Error("Backfill verification unavailable");
  const conversations = await db
    .from("member_ai_conversations")
    .select("id,title")
    .eq("user_id", owner)
    .in(
      "id",
      jobs.data.map((x) => x.conversation_id),
    );
  if (conversations.error) throw Error("Title verification unavailable");
  for (const job of jobs.data.filter((x) => x.status === "completed"))
    if (
      !conversations.data?.some(
        (x) =>
          x.id === job.conversation_id &&
          !x.title.startsWith("Conversation · ") &&
          [...x.title].length <= 80,
      )
    )
      throw Error("Stored title verification failed");
  console.log(
    JSON.stringify({
      model: "gpt-6-luna",
      outcomes: counts,
      verifiedCompleted: jobs.data.filter((x) => x.status === "completed")
        .length,
      totalChargeMicro: jobs.data.reduce(
        (n, x) => n + Number(x.charge_micro),
        0,
      ),
    }),
  );
}
void main().catch(() => {
  console.error(
    "Backfill stopped. Inspect private job outcomes before retrying; claimed jobs will never infer twice.",
  );
  process.exitCode = 1;
});
