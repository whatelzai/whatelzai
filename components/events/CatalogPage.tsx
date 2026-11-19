import { notFound, permanentRedirect, redirect } from "next/navigation";
import {
  loadPublicEvents,
  publicEventNow,
} from "@/lib/public-events/catalog-server";
import { resolveEvent } from "@/lib/public-events/catalog";
import CatalogDetail from "./CatalogDetail";
const oldPosterAliases = new Set([
  "ELZ-EVT-0001",
  "ELZ-EVT-0002",
  "ELZ-EVT-0003",
  "2026-10-22",
  "2026-10-29",
  "2026-11-05",
]);
export default async function CatalogPage({
  alias,
  path,
}: {
  alias: string;
  path: string;
}) {
  const event = resolveEvent(await loadPublicEvents(), alias);
  if (!event) {
    if (oldPosterAliases.has(alias)) redirect("/events#previous-sessions");
    notFound();
  }
  if (event.path !== path) permanentRedirect(event.path);
  return <CatalogDetail event={event} now={publicEventNow()} />;
}
