import "server-only";
import { cache } from "react";
import { supabaseAdmin as db } from "./supabase-server";
import { mapEvent, currentEvent } from "./public-events/map";
import type { EventCheckoutConfig } from "./event-registration-policy";
import { projectEvent, type CatalogRow } from "./public-events/catalog";
export const loadCheckoutConfig = cache(
  async (key: string): Promise<EventCheckoutConfig | null> => {
    if (key === mapEvent.key)
      return {
        eventId: mapEvent.id,
        eventKey: key,
        amount: 700,
        priceId: "price_1UZvRuPA71qp9sGS6HIJUA8N",
      };
    const offer = await db
      .from("event_signup_offers")
      .select("event_id,event_key,amount,currency,return_amount")
      .eq("event_key", key)
      .maybeSingle();
    if (offer.error) throw Error("Event payment configuration unavailable");
    if (!offer.data) return null;
    const event = await db
      .from("events")
      .select("id,metadata")
      .eq("id", offer.data.event_id)
      .maybeSingle();
    if (event.error) throw Error("Event payment details unavailable");
    if (!event.data) return null;
    const price =
        event.data.metadata?.stripe_price_id ||
        (key === currentEvent.key ? "price_1UbbJePA71qp9sGSyhBLclEo" : null),
      eventId = event.data.metadata?.event_id || event.data.id;
    if (
      typeof price !== "string" ||
      !/^price_[A-Za-z0-9]+$/.test(price) ||
      typeof eventId !== "string" ||
      offer.data.currency !== "sgd"
    )
      return null;
    return {
      eventId,
      eventKey: key,
      amount: offer.data.amount,
      priceId: price,
      ...(Number.isInteger(event.data.metadata?.personal_amount) &&
      event.data.metadata.personal_amount > 0 &&
      event.data.metadata.personal_amount < offer.data.amount &&
      /^price_[A-Za-z0-9]+$/.test(event.data.metadata.personal_price_id || "")
        ? {
            personalOffer: {
              amount: event.data.metadata.personal_amount,
              priceId: event.data.metadata.personal_price_id,
            },
          }
        : {}),
      ...(typeof offer.data.return_amount === "number" &&
      offer.data.return_amount > 0 &&
      offer.data.return_amount < offer.data.amount &&
      /^price_[A-Za-z0-9]+$/.test(
        event.data.metadata?.return_stripe_price_id || "",
      )
        ? {
            returnOffer: {
              amount: offer.data.return_amount,
              priceId: event.data.metadata.return_stripe_price_id,
            },
          }
        : {}),
    };
  },
);
export async function checkoutConfigForMarker(
  marker: string,
): Promise<EventCheckoutConfig | null> {
  if (marker === mapEvent.id) return loadCheckoutConfig(mapEvent.key);
  if (!/^[A-Za-z0-9-]{1,100}$/.test(marker)) return null;
  const r = await db
    .from("events")
    .select("metadata")
    .contains("metadata", { event_id: marker })
    .limit(2);
  if (r.error) throw Error("Event payment configuration unavailable");
  if (r.data.length !== 1 || typeof r.data[0].metadata?.event_key !== "string")
    return null;
  return loadCheckoutConfig(r.data[0].metadata.event_key);
}
export async function ticketEventDetails(key: string) {
  if (key === mapEvent.key) return mapEvent;
  if (key === currentEvent.key) return currentEvent;
  const r = await db
    .from("events")
    .select("id,type,slug,name,date,location,published,metadata")
    .contains("metadata", { event_key: key })
    .limit(2);
  if (r.error) throw Error("Event ticket details unavailable");
  if (r.data.length !== 1) return null;
  const row = r.data[0] as CatalogRow;
  return projectEvent({
    ...row,
    published: true,
    metadata: { ...row.metadata, status: "scheduled" },
  });
}
