import Link from "next/link";
import { notFound } from "next/navigation";
import { loadPublicEvents } from "@/lib/public-events/catalog-server";
import { resolveEvent } from "@/lib/public-events/catalog";
import FeedbackNextEvents from "@/components/events/FeedbackNextEvents";
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
  return (
    <main className="field-wrap event-feedback">
      <header>
        <h1>Thank you.</h1>
        <p>Your feedback helps me shape the next session.</p>
        <p>
          {event.title}
          <br />
          {event.dateLabel}
        </p>
        <p className="feedback-reference">{event.id}</p>
        <Link href={event.path} className="text-link">
          Back to the event ↗
        </Link>
      </header>
      <FeedbackNextEvents />
    </main>
  );
}
