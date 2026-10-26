// Content input is private data; never embed editorial content in this script.
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
const schema = z.object({
  collections: z
    .array(
      z.object({
        id: z.string(),
        kind: z.enum([
          "culture",
          "product-class",
          "pipeline",
          "marketing-plan",
        ]),
        title: z.string(),
        metadata: z.record(z.string(), z.unknown()),
        provenance: z.record(z.string(), z.unknown()),
        position: z.number().int(),
        published: z.boolean(),
      }),
    )
    .min(1)
    .max(100),
  entries: z
    .array(
      z.object({
        id: z.string(),
        collection_id: z.string(),
        title: z.string().default(""),
        body: z.string().min(1),
        metadata: z.record(z.string(), z.unknown()),
        position: z.number().int(),
        published: z.boolean(),
      }),
    )
    .max(1000),
});
async function main() {
  const file = process.argv[2];
  if (!file) throw Error("Pass a private import JSON path.");
  const input = schema.parse(JSON.parse(await readFile(file, "utf8")));
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const result = await db.rpc("import_member_knowledge", {
    p_collections: input.collections,
    p_entries: input.entries,
  });
  if (result.error)
    throw Error(
      "Knowledge import failed; no records committed. Check duplicate IDs and schema.",
    );
  for (const [table, rows] of [
    ["member_knowledge_collections", input.collections],
    ["member_knowledge_entries", input.entries],
  ] as const) {
    const actual = await db
      .from(table)
      .select("*")
      .in(
        "id",
        rows.map((x) => x.id),
      );
    if (actual.error || actual.data?.length !== rows.length)
      throw Error("Imported record verification failed.");
    for (const row of rows) {
      const saved = actual.data.find((x) => x.id === row.id);
      for (const [key, value] of Object.entries(row))
        if (
          JSON.stringify(normalize(saved[key])) !==
          JSON.stringify(normalize(value))
        )
          throw Error("Import round-trip mismatch.");
    }
  }
  console.log(
    `Verified database import: ${input.collections.length} collections, ${input.entries.length} entries. Content not logged.`,
  );
}
void main().catch(() => {
  console.error(
    "Knowledge import failed. Check private input, credentials and database state; existing rows are never overwritten.",
  );
  process.exitCode = 1;
});
function normalize(value: unknown): unknown {
  return Array.isArray(value)
    ? value.map(normalize)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.entries(value)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => [k, normalize(v)]),
        )
      : value;
}
