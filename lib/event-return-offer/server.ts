import "server-only";
import { supabaseAdmin as db } from "@/lib/supabase-server";
import { feedbackHash } from "@/lib/event-feedback/server";
import { signupHash } from "@/lib/platform-event-registration";
import {
  loadPublicEvents,
  publicEventNow,
} from "@/lib/public-events/catalog-server";
import { feedbackNext } from "@/lib/event-feedback/model";
import { loadCheckoutConfig } from "@/lib/event-offer";
import {
  RETURN_OFFER_COOKIE,
  offerSeconds,
  type ReturnOfferView,
} from "./model";
export type StoredReturnOffer = {
  id: string;
  source_event_id: string;
  target_event_id: string;
  email: string;
  expires_at: string;
  claimed_at: string | null;
  dismissed_at: string | null;
  attempt_id: string | null;
};
export async function issueReturnOffer(feedbackId: string, sourceId: string) {
  const target = feedbackNext(await loadPublicEvents(), publicEventNow());
  if (!target?.key || !target.registrationUrl) return null;
  const config = await loadCheckoutConfig(target.key);
  if (!config?.returnOffer) return null;
  const token = feedbackHash(`return:${feedbackId}:${target.recordId}`);
  const r = await db.rpc("issue_event_return_offer", {
    p_feedback: feedbackId,
    p_target: target.recordId,
    p_token_hash: signupHash(token),
  });
  if (r.error) throw Error("Return offer unavailable");
  const row = r.data as StoredReturnOffer | null;
  return row?.id &&
    row.source_event_id === sourceId &&
    !row.dismissed_at &&
    Date.parse(row.expires_at) > Date.now()
    ? { token, row }
    : null;
}
export function returnCookieHeader(token: string, url: string) {
  return `${RETURN_OFFER_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=300${new URL(url).protocol === "https:" ? "; Secure" : ""}`;
}
export async function loadReturnOffer(token: string | undefined) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const r = await db
    .from("event_return_offers")
    .select(
      "id,source_event_id,target_event_id,email,expires_at,claimed_at,dismissed_at,attempt_id",
    )
    .eq("token_hash", signupHash(token))
    .maybeSingle();
  if (r.error) throw Error("Return offer unavailable");
  const row = r.data as StoredReturnOffer | null;
  return row && !row.dismissed_at && Date.parse(row.expires_at) > Date.now()
    ? row
    : null;
}
export async function returnOfferView(
  row: StoredReturnOffer,
  eventKey: string,
): Promise<ReturnOfferView | null> {
  const config = await loadCheckoutConfig(eventKey);
  return config?.returnOffer
    ? {
        id: row.id,
        email: row.email,
        expiresAt: row.expires_at,
        initialSeconds: offerSeconds(row.expires_at),
        amount: config.returnOffer.amount,
        regularAmount: config.amount,
      }
    : null;
}
