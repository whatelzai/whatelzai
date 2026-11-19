import "server-only";
import { createHash } from "node:crypto";
import { dailyOwner } from "./server";
import { emdeeConnection } from "./connections";
import { readEmdee } from "./emdee-client";
import { DAILY_PARENT } from "./paths";
import { findRoutine, parseRoutine } from "./routines-model";

export async function loadRoutine(slug: string) {
  const owner = await dailyOwner();
  const routine = findRoutine(slug);
  if (!routine) return { status: "not-found" as const };
  try {
    const connection = await emdeeConnection(owner);
    if (connection?.parentPath !== DAILY_PARENT)
      return { status: "disconnected" as const };
    const path = `${DAILY_PARENT.slice(0, -3).toLowerCase()}/04-routines/${routine.file}`;
    const doc = await readEmdee(connection, path);
    if (!doc) return { status: "missing" as const };
    const parsed = parseRoutine(doc.content ?? "", slug);
    return {
      status: "ready" as const,
      routine,
      path,
      ...parsed,
      checksum: createHash("sha256").update(parsed.source).digest("hex"),
    };
  } catch {
    return { status: "unavailable" as const };
  }
}
