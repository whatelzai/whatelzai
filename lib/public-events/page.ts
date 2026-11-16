import "server-only";
import type { Metadata } from "next";
import { loadPublicEvents } from "./catalog-server";
import { resolveEvent } from "./catalog";
export async function publicEventMetadata(alias: string): Promise<Metadata> {
  const event = resolveEvent(await loadPublicEvents(), alias);
  if (!event) return { title: "Events with Edmund" };
  return {
    title: `${event.title} — ${event.dateLabel}`,
    description: event.description,
    alternates: { canonical: `https://whatelz.ai${event.path}` },
    robots: event.listed
      ? { index: true, follow: true }
      : { index: false, follow: true },
  };
}
