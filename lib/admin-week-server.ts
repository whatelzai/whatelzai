import "server-only";
import { emdeeConnection } from "./daily/connections";
import { DAILY_PARENT } from "./daily/paths";
import { loadBriefWithConnection } from "./daily/emdee";
import { readEmdee } from "./daily/emdee-client";
import { previousWeek } from "./daily/weekly-model";
import { loadDailyTasks } from "./daily/server";
import type { Brief, BriefKind } from "./daily/model";
import type { Source } from "./admin-overview/model";
async function safe<T>(read: () => Promise<T>): Promise<Source<T>> {
  try {
    return { status: "ready", data: await read() };
  } catch {
    return { status: "unavailable" };
  }
}
/** Caller verifies sole owner before initiating these independent, uncached reads. */
export function weekSources(owner: string, day: string, now: Date) {
  const connection = emdeeConnection(owner);
  const getConnection = async () => {
    const c = await connection;
    if (c?.parentPath !== DAILY_PARENT) throw Error("Daily unavailable");
    return c;
  };
  const brief = (kind: BriefKind) =>
    safe<Brief>(async () =>
      loadBriefWithConnection(await getConnection(), day, kind),
    );
  return {
    tasks: safe(() => loadDailyTasks(day)),
    morning: brief("morning"),
    evening: brief("evening"),
    weekly: safe(async () => {
      const doc = await readEmdee(
        await getConnection(),
        previousWeek(now).path,
      );
      return !!doc?.content
        ?.split(/^## Notes\s*$/m)[1]
        ?.split(/^## /m)[0]
        ?.trim();
    }),
  };
}
