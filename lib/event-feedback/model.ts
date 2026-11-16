import { z } from "zod";
import {
  eventEnds,
  nextWeeklyEvent,
  type CatalogEvent,
} from "../public-events/catalog";
export const eventFeedbackInput = z
  .object({
    eventId: z.string().regex(/^[A-Za-z0-9-]{1,100}$/),
    requestId: z.uuid(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(1500).default(""),
    website: z.string().max(0).default(""),
  })
  .strict();
export const feedbackPath = (id: string) =>
  `/events/feedback/${encodeURIComponent(id)}`;
export const feedbackOpen = (event: CatalogEvent, now = Date.now()) =>
  event.listed && eventEnds(event) <= now;
export function feedbackNext(events: CatalogEvent[], now = Date.now()) {
  return nextWeeklyEvent(events, now);
}
