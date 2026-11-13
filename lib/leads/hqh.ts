import "server-only";
import { supabaseAdmin as db } from "@/lib/supabase-server";
import { readLeadContext } from "./context";
import { sharedBriefingIds } from "@/lib/fcos/sharing";
import { leadOwner } from "./server";
import { boundedFollowupNotes } from "./hqh-history";
import { hqhFacts } from "./hqh-model";

/** Resolve through the existing privacy gate before reading extra context. */
export async function readHqhContext(
  query: string,
  noteBudget = 8000,
): Promise<Record<string, unknown>> {
  const names = query
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean);
  if (names.length > 6)
    throw Error("Request up to six Baobeis per HQH lookup.");
  if (names.length > 1) {
    const results = await Promise.all(
      names.map((name) =>
        readHqhContext(name, Math.floor(10000 / names.length)),
      ),
    );
    return {
      people: results.map((result) => ({
        person: result.person,
        currentHqh: result.currentHqh,
        history: result.history,
        items: result.items,
        coverage: result.coverage,
      })),
      format: results.find((x) => typeof x.format === "string")?.format,
      coverage:
        "Requested order retained. Each person is independently permission-checked; unresolved names are explicitly unavailable. Per-person history coverage is shown in each result.",
    };
  }
  query = names[0] ?? "";
  if (!query.trim()) throw Error("Provide one Baobei name for HQH context.");
  const context = await readLeadContext(query);
  const exact = context.items.filter(
    (x) => String(x.name).toLowerCase() === query.toLowerCase(),
  );
  const candidates = exact.length ? exact : context.items;
  if (candidates.length !== 1)
    return {
      items: [],
      coverage:
        "Name is ambiguous or unavailable. Specify one full name; hidden profiles remain unavailable.",
    };
  const person = candidates[0];
  const [profile, format] = await Promise.all([
    db
      .from("member_leads")
      .select("metadata")
      .eq("id", person.id)
      .maybeSingle(),
    db
      .from("member_knowledge_entries")
      .select("body")
      .eq("id", "weos-hqh-whatsapp-format-v1")
      .eq("published", true)
      .maybeSingle(),
  ]);
  if (profile.error || format.error) throw Error("HQH context unavailable.");
  const viewer = await leadOwner();
  const permitted = await sharedBriefingIds(viewer);
  const followups = await db
    .from("member_briefings")
    .select(
      "id,title,kind,status,occurred_on,updated_at,observations,reflections,next_steps",
    )
    .or(
      `owner_id.eq.${viewer},id.in.(${
        permitted
          .slice(0, 500)
          .map((x) => x.id)
          .join(",") || "00000000-0000-0000-0000-000000000000"
      })`,
    )
    .contains("lead_ids", [person.id])
    .order("updated_at", { ascending: false })
    .limit(20);
  if (followups.error) throw Error("Follow-up notes unavailable.");
  const history = boundedFollowupNotes(followups.data ?? [], noteBudget);

  return {
    person: {
      id: person.id,
      name: person.name,
      membership: person.membership,
      access: person.access,
      story: person.story,
      interests: person.interests,
      concerns: person.concerns,
      community: person.community,
      linkedNotes: person.linkedNotes,
      noteCoverage: person.noteCoverage,
      url: person.url,
    },
    currentHqh: hqhFacts(profile.data?.metadata),
    history,
    format:
      format.data?.body ??
      "No saved HQH format available; follow the user's requested layout.",
    coverage:
      "Person-based current profile and dated linked follow-up notes. Treat previous HQHs as preparation, HHHs as attributed reflections, and past event plans as history. Follow the explicit history coverage; do not claim every note was read. Event context is optional.",
  };
}
