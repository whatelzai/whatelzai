import "server-only";
import { supabaseAdmin as db } from "@/lib/supabase-server";
import { readLeadContext } from "./context";
import { hqhFacts } from "./hqh-model";

/** Resolve through the existing privacy gate before reading extra context. */
export async function readHqhContext(
  query: string,
): Promise<Record<string, unknown>> {
  const names = query
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean);
  if (names.length > 6)
    throw Error("Request up to six Baobeis per HQH lookup.");
  if (names.length > 1) {
    const results = await Promise.all(
      names.map((name) => readHqhContext(name)),
    );
    return {
      people: results.map((result) => ({
        person: result.person,
        currentHqh: result.currentHqh,
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
    format:
      format.data?.body ??
      "No saved HQH format available; follow the user's requested layout.",
    coverage:
      "Current permitted profile and selected HQH intake fields. Linked notes retain the excerpt coverage shown above; this is not a full historical HHH review. Retrieve another person in a separate call; multiple calls can be made together.",
  };
}
