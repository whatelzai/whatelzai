import { cookies } from "next/headers";
import { RETURN_OFFER_COOKIE } from "@/lib/event-return-offer/model";
import {
  loadReturnOffer,
  returnOfferView,
} from "@/lib/event-return-offer/server";
import { feedbackNext } from "@/lib/event-feedback/model";
import { publicEventNow } from "@/lib/public-events/catalog-server";
import { upcomingEvents } from "@/lib/public-events/catalog";
import FeedbackThanks from "./FeedbackThanks";
import { notFound } from "next/navigation";
import { loadPublicEvents } from "@/lib/public-events/catalog-server";
import { resolveEvent } from "@/lib/public-events/catalog";
import "../../../event-experience.css";
import "../../../catalog.css";
import "../../feedback.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Thanks for your feedback",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function Page({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const event = resolveEvent(await loadPublicEvents(), (await params).eventId);
  if (!event || !event.listed) notFound();
  const events = await loadPublicEvents();
  const next = feedbackNext(events, publicEventNow());
  let offer = null;
  try {
    const row = await loadReturnOffer(
      (await cookies()).get(RETURN_OFFER_COOKIE)?.value,
    );
    if (
      row &&
      next?.key &&
      row.source_event_id === event.recordId &&
      row.target_event_id === next.recordId &&
      !row.claimed_at
    )
      offer = await returnOfferView(row, next.key);
  } catch {
    /* Feedback remains saved even if the optional return offer is unavailable. */
  }
  return (
    <FeedbackThanks
      event={next}
      offer={offer}
      intensive={
        upcomingEvents(events, publicEventNow()).find(
          (e) => e.format === "intensive",
        ) || null
      }
    />
  );
}
