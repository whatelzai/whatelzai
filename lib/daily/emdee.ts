import "server-only";
import { dailyOwner } from "./server";
import { emdeeConnection, type EmdeeConnection } from "./connections";
import { emdeeCall, readEmdee, type Envelope } from "./emdee-client";
import { branchParent, DAILY_PARENT, DAILY_TITLE } from "./paths";
import { briefPath, type Brief, type BriefKind } from "./model";

export async function loadBrief(day: string, kind: BriefKind): Promise<Brief> {
  const connection = await emdeeConnection(await dailyOwner());
  if (!connection?.parentPath)
    throw new Error("Connect EMDEE before saving a brief.");
  return loadBriefWithConnection(connection, day, kind);
}

// Server-only read capability: callers verify owner and connection once per request.
export async function loadBriefWithConnection(
  connection: EmdeeConnection,
  day: string,
  kind: BriefKind,
): Promise<Brief> {
  const parent = connection.parentPath;
  if (!parent || connection.expiresAt <= Date.now())
    throw Error("Reconnect EMDEE before reading Daily.");
  const path = briefPath(parent, day, kind);
  const doc = await readEmdee(connection, path);
  const section = doc?.sections.find((s) => s.heading === "Notes");
  // Keep the full Notes body, including nested H3 headings. Only H2 splits it.
  const body =
    doc?.content
      ?.split(/^## Notes\s*$/m)[1]
      ?.split(/^## /m)[0]
      ?.trim() ?? "";
  return { body, path, hash: section?.content_hash ?? "", exists: !!doc };
}
export async function saveBrief(
  day: string,
  kind: BriefKind,
  body: string,
  hash: string,
): Promise<Brief> {
  const connection = await emdeeConnection(await dailyOwner());
  if (!connection?.parentPath)
    throw new Error("Connect EMDEE before saving a brief.");
  if (connection.parentPath !== DAILY_PARENT)
    throw new Error(
      "Reconnect EMDEE to Personal Daily before saving new briefs.",
    );
  const current = await loadBrief(day, kind);
  if (current.hash !== hash)
    throw new Error(
      "This brief changed in EMDEE. Reload before saving; keep a copy of your edits.",
    );
  if (current.exists) {
    await emdeeCall(connection, "patch_section", {
      path: current.path,
      heading: "Notes",
      body,
      expected_content_hash: hash,
      no_auto_hash: true,
      author: "whatelz-daily",
    });
  } else {
    const parent = branchParent(DAILY_PARENT, kind);
    const doc = await emdeeCall<Envelope>(connection, "get_doc", {
      path: parent,
      full: false,
    });
    await emdeeCall(connection, "create_child", {
      parent_path: parent,
      child_path: current.path,
      title: `${DAILY_TITLE} — ${kind === "morning" ? "01-MORNING" : "02-EVENING"} — ${day}`,
      summary: `${kind === "morning" ? "Morning preparation" : "Evening closeout"} for ${day}, Asia/Singapore.`,
      body,
      expected_parent_content_hash: doc.doc_content_hash,
      no_auto_hash: true,
      author: "whatelz-daily",
    });
  }
  const saved = await loadBrief(day, kind);
  if (saved.body !== body.trim())
    throw new Error(
      "The EMDEE write needs verification. Reload before retrying.",
    );
  return saved;
}
