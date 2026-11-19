import type { ChatMessage } from "./model";
export function hqhDiscoveryQuery(history: ChatMessage[]) {
  const users = history.filter((x) => x.role === "user").slice(-3);
  const latest = users.at(-1)?.body ?? "";
  if (/\bhhh\b|会后会/i.test(latest) && !/\bhqh\b|会前会/i.test(latest))
    return null;
  const index = users.findLastIndex((x) => /\bhqh\b|会前会/i.test(x.body));
  if (
    index < 0 ||
    /^(thanks?|thank you|谢谢)[!.\s]*$/i.test(users.at(-1)?.body.trim() ?? "")
  )
    return null;
  const simple = users
    .at(-1)
    ?.body.match(/^Create HQH for: ([^\n]+)\nLanguage:/i);
  if (simple) return { source: "hqh" as const, query: simple[1] };
  const selected = users
    .at(-1)
    ?.body.match(/selected Baobeis, in this order: ([^\n]+)\.\nLanguage:/i);
  if (selected) return { source: "hqh" as const, query: selected[1] };
  return {
    source: "hqh_discover" as const,
    query: users
      .slice(index)
      .map((x) => x.body)
      .join(" ")
      .slice(0, 100),
  };
}
export type HqhEventGroup = { event: string; date: string; leadIds: string[] };
export function discoverHqhEvent(
  rows: { event_name: string; occurred_on: string; lead_ids: string[] }[],
  allowed: ReadonlySet<string>,
  query: string,
  day: string,
) {
  const groups = new Map<string, HqhEventGroup>();
  for (const row of rows) {
    const ids = row.lead_ids.filter((id) => allowed.has(id));
    if (!ids.length) continue;
    const key = `${row.occurred_on}:${row.event_name.trim().toLowerCase()}`;
    const group = groups.get(key) ?? {
      event: row.event_name,
      date: row.occurred_on,
      leadIds: [],
    };
    group.leadIds = [...new Set([...group.leadIds, ...ids])];
    groups.set(key, group);
  }
  const stop = new Set(
    "can you help me write prepare create draft the for my our six 6 baobeis baobei this a an in english chinese hqh please".split(
      " ",
    ),
  );
  const tokens = (query.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(
    (x) => !stop.has(x) && x.length > 1,
  );
  const ranked = [...groups.values()].map((group) => ({
    group,
    score: tokens.filter(
      (x) => group.event.toLowerCase().includes(x) || group.date.includes(x),
    ).length,
  }));
  const max = Math.max(0, ...ranked.map((x) => x.score));
  let matches = ranked
    .filter((x) =>
      max > 0
        ? x.score === max
        : Math.abs(Date.parse(x.group.date) - Date.parse(day)) <= 7 * 86400000,
    )
    .map((x) => x.group);
  matches = matches.sort((a, b) => a.date.localeCompare(b.date));
  return {
    selected: matches.length === 1 ? matches[0] : null,
    candidates: matches.slice(0, 8),
  };
}
