import "server-only";
import { dailyOwner } from "./daily/server";
import { emdeeConnection } from "./daily/connections";
import { readEmdee } from "./daily/emdee-client";
import { MANDALA_PATH } from "./mandala";

export async function loadMandala() {
  // Do not catch authorization failures or read credentials before this gate.
  const owner = await dailyOwner();
  try {
    const connection = await emdeeConnection(owner);
    if (!connection) return { state: "unavailable" as const };
    const doc = await readEmdee(connection, MANDALA_PATH);
    if (!doc?.content) return { state: "missing" as const };
    const body = doc.content
      .split(/^## Notes\s*$/m)[1]
      ?.split(/^## /m)[0]
      ?.trim();
    if (!body) return { state: "empty" as const };
    return { state: "ready" as const, doc, body };
  } catch {
    return { state: "unavailable" as const };
  }
}
