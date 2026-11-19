import { z } from "zod";
export const cultureMetadata = z.object({
  displayName: z.string().max(300),
  teacher: z.string().max(300),
  source: z.string().max(1000).default(""),
  providedAt: z.string().max(30).default(""),
  attributionStatus: z.string().max(100).default("unverified"),
  chapters: z
    .array(z.object({ id: z.string().max(80), title: z.string().max(300) }))
    .max(200)
    .default([]),
});
export const sayingMetadata = z.object({
  chapters: z.array(z.string().max(80)).max(200),
  occurrences: z
    .array(
      z.object({
        chapterId: z.string().max(80),
        sourceOrder: z.number().int().positive(),
      }),
    )
    .max(500)
    .default([]),
});
export type CultureCollection = z.infer<typeof cultureMetadata> & {
  id: string;
  title: string;
  quotes: { id: string; text: string; chapters: string[] }[];
};
export function cultureFromRows(
  collections: { id: string; title: string; metadata: unknown }[],
  entries: {
    id: string;
    collection_id: string;
    body: string;
    metadata: unknown;
  }[],
): CultureCollection[] {
  return collections.map((collection) => {
    const metadata = cultureMetadata.parse(collection.metadata);
    const ids = new Set(metadata.chapters.map((chapter) => chapter.id));
    if (ids.size !== metadata.chapters.length)
      throw Error("Duplicate chapters");
    const quotes = entries
      .filter((entry) => entry.collection_id === collection.id)
      .map((entry) => {
        const info = sayingMetadata.parse(entry.metadata);
        if (info.chapters.some((id) => !ids.has(id)))
          throw Error("Unknown chapter");
        return { id: entry.id, text: entry.body, chapters: info.chapters };
      });
    return { id: collection.id, title: collection.title, ...metadata, quotes };
  });
}
