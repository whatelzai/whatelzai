import { loadFeedbackForm } from "@/lib/event-feedback/server";
import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import {
  loadPublicEvents,
  publicEventNow,
} from "@/lib/public-events/catalog-server";
import { resolveEvent } from "@/lib/public-events/catalog";
import { feedbackOpen, feedbackPath } from "@/lib/event-feedback/model";
import FeedbackNextEvents from "@/components/events/FeedbackNextEvents";
import FeedbackForm from "./FeedbackForm";
import "../../event-experience.css";
import "../../catalog.css";
import "../feedback.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Event feedback",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function Page({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = resolveEvent(await loadPublicEvents(), eventId);
  if (!event || !event.listed) notFound();
  if (event.id !== eventId) permanentRedirect(feedbackPath(event.id));
  const form = feedbackOpen(event, publicEventNow())
    ? await loadFeedbackForm(event.recordId)
    : null;
  return (
    <main className="field-wrap event-feedback">
      <header>
        <Link href={event.path} className="event-back-link">
          ← Event details
        </Link>
        <h1>{form?.title ?? "Event feedback"}</h1>
        <p>
          {event.title}
          <br />
          {event.dateLabel}
        </p>
        <p className="feedback-reference">{event.id}</p>
      </header>
      {feedbackOpen(event, publicEventNow()) ? (
        form ? (
          <FeedbackForm eventId={event.id} config={form} />
        ) : (
          <p>Feedback is not available for this session.</p>
        )
      ) : (
        <p>Feedback opens after this session ends.</p>
      )}
      <FeedbackNextEvents />
    </main>
  );
}
