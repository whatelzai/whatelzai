import { currentEvent as mapEvent } from "@/lib/public-events/map";
export const eventUrl = `https://whatelz.ai${mapEvent.path}`;
export const posterFilename = `${mapEvent.id.toLowerCase()}-poster.png`;
export const eventCaption = `${mapEvent.title}\n${mapEvent.dateLabel}\n${mapEvent.timeLabel}\n${mapEvent.venue} · ${mapEvent.address}\n${mapEvent.price} per person\n\nRegister: ${eventUrl}`;
export function canSharePoster(
  nav: Pick<Navigator, "canShare" | "share">,
  file: File,
) {
  try {
    return (
      typeof nav.share === "function" &&
      typeof nav.canShare === "function" &&
      nav.canShare({ files: [file] })
    );
  } catch {
    return false;
  }
}
export async function sharePoster(nav: Pick<Navigator, "share">, file: File) {
  try {
    await nav.share({ files: [file] });
    return "opened" as const;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError")
      return "cancelled" as const;
    throw e;
  }
}
