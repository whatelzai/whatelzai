import "server-only";
import { createHash } from "node:crypto";
import { supabaseAdmin as db } from "@/lib/supabase-server";
import { emdeeConnection } from "@/lib/daily/connections";
import { readEmdee } from "@/lib/daily/emdee-client";
import { DAILY_PARENT } from "@/lib/daily/paths";
import { singaporeDay } from "@/lib/daily/model";
import {
  rhythmKinds,
  rhythmHub,
  rhythmPath,
  latestRhythmKeys,
  notesBody,
  type RhythmKind,
  type RhythmSnapshot,
} from "./model";
const fields =
  "kind,entry_key,document_path,body,version,source_updated_at,source_created_at,read_version";
export async function cachedRhythms(owner: string) {
  const r = await db
    .from("admin_rhythm_snapshots")
    .select(fields)
    .eq("owner_id", owner);
  if (r.error) throw Error("Saved briefings could not be read");
  return (r.data ?? []) as RhythmSnapshot[];
}
/** Only called after owner verification, or by the independently verified owner cron. */
export async function syncRhythms(owner: string) {
  const connection = await emdeeConnection(owner);
  if (connection?.parentPath !== DAILY_PARENT)
    throw Error("Reconnect EMDEE to check for new entries");
  const results = await Promise.allSettled(
    rhythmKinds.map(async (kind) => {
      const hub = await readEmdee(connection, rhythmHub(kind));
      if (!hub?.content) throw Error("Briefing index unavailable");
      for (const key of latestRhythmKeys(
        hub.content,
        kind,
        singaporeDay(),
      ).slice(0, 5)) {
        const path = rhythmPath(kind, key),
          doc = await readEmdee(connection, path);
        const body = doc?.content ? notesBody(doc.content) : "";
        if (!doc || !body) continue;
        const updated = doc.last_edited_at ?? doc.authored_at;
        const created = doc.authored_at ?? updated;
        if (
          !updated ||
          !created ||
          !Number.isFinite(Date.parse(updated)) ||
          !Number.isFinite(Date.parse(created))
        )
          throw Error("Briefing timestamp unavailable");
        const version = createHash("sha256")
          .update(path + "\n" + body)
          .digest("hex");
        const r = await db.rpc("save_admin_rhythm", {
          p_owner: owner,
          p_kind: kind,
          p_entry: key,
          p_path: path,
          p_body: body,
          p_version: version,
          p_updated: updated,
          p_created: created,
        });
        if (r.error) throw Error("Briefing could not be saved");
        return;
      }
    }),
  );
  if (results.some((r) => r.status === "rejected"))
    throw Error("Some briefings could not be refreshed");
}
export async function loadRhythms(owner: string, refresh = true) {
  let fresh = true;
  if (refresh)
    try {
      await syncRhythms(owner);
    } catch {
      fresh = false;
    }
  return { snapshots: await cachedRhythms(owner), fresh };
}
export async function markRhythmRead(
  owner: string,
  kind: RhythmKind,
  version: string,
) {
  const r = await db
    .from("admin_rhythm_snapshots")
    .update({ read_version: version })
    .eq("owner_id", owner)
    .eq("kind", kind)
    .eq("version", version);
  if (r.error) throw Error("Read status could not be saved");
  const notice = await db
    .from("admin_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("owner_id", owner)
    .eq("source_key", "push:rhythm-" + kind + "-" + version.slice(0, 24));
  if (notice.error) throw Error("Notification could not be marked read");
}
