import "server-only";
import { supabaseAdmin as db } from "@/lib/supabase-server";
import { leadOwner } from "./server";
import { sharedLeadIds } from "./sharing";
import { todayUtc8 } from "./model";
import { discoverHqhEvent } from "@/lib/member-ai/hqh-discovery";
import { readHqhContext } from "./hqh";
export async function readHqhDiscoveryContext(query: string) {
  const owner = await leadOwner(),
    day = todayUtc8();
  const from = new Date(Date.parse(day) - 7 * 86400000)
    .toISOString()
    .slice(0, 10);
  const until = new Date(Date.parse(day) + 60 * 86400000)
    .toISOString()
    .slice(0, 10);
  const [notes, own, shared] = await Promise.all([
    db
      .from("member_briefings")
      .select("event_name,occurred_on,lead_ids")
      .eq("owner_id", owner)
      .eq("kind", "HQH")
      .gte("occurred_on", from)
      .lte("occurred_on", until)
      .order("updated_at", { ascending: false })
      .limit(100),
    db.from("member_leads").select("id,name").eq("owner_id", owner).limit(500),
    sharedLeadIds(owner),
  ]);
  if (notes.error || own.error) throw Error("Saved HQH discovery unavailable.");
  const others = shared.length
    ? await db
        .from("member_leads")
        .select("id,name")
        .in(
          "id",
          shared.slice(0, 500).map((x) => x.id),
        )
    : { data: [], error: null };
  if (others.error) throw Error("Permitted Baobei names unavailable.");
  const people = [...(own.data ?? []), ...(others.data ?? [])];
  const normalized = query.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const mentioned = people.filter((p) => {
    const parts = p.name.toLowerCase().split(/\s+/);
    const aliases = [p.name, parts.slice(-2).join(""), parts[0]].filter(
      (x) => x && x.length >= 4,
    );
    return aliases.some((name) =>
      normalized.includes(name.replace(/[^\p{L}\p{N}]/gu, "")),
    );
  });
  if (mentioned.length && mentioned.length <= 6) {
    const contexts = await Promise.all(
      mentioned.map((p) =>
        readHqhContext(p.name, Math.floor(10000 / mentioned.length)),
      ),
    );
    return {
      resolved: true,
      names: mentioned.map((p) => p.name),
      people: contexts.map((x) => ({
        person: x.person,
        currentHqh: x.currentHqh,
        history: x.history,
        coverage: x.coverage,
      })),
      format: contexts.find((x) => x.format)?.format,
      coverage:
        "Resolved people from the request. HQH is person-based; an event is optional. Use dated notes as follow-up history, not as current attendance plans.",
    };
  }
  const found = discoverHqhEvent(
    notes.data ?? [],
    new Set(people.map((x) => x.id)),
    query,
    day,
  );
  if (!found.selected)
    return {
      resolved: false,
      candidates: found.candidates.map((x) => ({
        event: x.event,
        date: x.date,
      })),
      coverage:
        "Searched your latest 100 saved HQHs from the last seven days through the next sixty days. Ask only which event if ambiguous; do not ask for names already saved.",
    };
  const names = found.selected.leadIds.map(
    (id) => people.find((p) => p.id === id)!.name,
  );
  if (names.length > 6)
    return {
      resolved: false,
      event: found.selected.event,
      names,
      coverage:
        "More than six permitted people are linked; ask which people to include.",
    };
  const contexts = await Promise.all(
    names.map((name) => readHqhContext(name, Math.floor(10000 / names.length))),
  );
  return {
    resolved: true,
    event: found.selected.event,
    date: found.selected.date,
    optionalContext:
      "Saved event used only to identify the requested group; the HQH belongs to each person, not the trip.",
    names,
    people: contexts.map((x) => ({
      person: x.person,
      currentHqh: x.currentHqh,
      history: x.history,
      coverage: x.coverage,
    })),
    format: contexts.find((x) => x.format)?.format,
    coverage:
      "Resolved from your saved event HQHs, not priority ranking. Each profile was permission-checked again. Use saved facts and current message language; ask only genuinely unresolved details.",
  };
}
