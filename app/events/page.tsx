import type { Metadata } from "next";
import Link from "next/link";
import {
  loadPublicEvents,
  publicEventNow,
} from "@/lib/public-events/catalog-server";
import { nextWeeklyEvent } from "@/lib/public-events/catalog";
import EventBrowser from "@/components/events/EventBrowser";
import { browseItems, validMonth } from "@/lib/public-events/calendar";
import "../offers.css";
import "./event-experience.css";
import "./catalog.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Events with Edmund — AI Skillset & Money Mindset",
  description:
    "Upcoming weekly sessions and previous events with Edmund. Practical AI learning and money mindset, one conversation at a time.",
  alternates: { canonical: "https://whatelz.ai/events" },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; month?: string }>;
}) {
  const query = await searchParams;
  const today = new Date(publicEventNow()).toLocaleDateString("en-CA", {
    timeZone: "Asia/Singapore",
  });
  const events = await loadPublicEvents(),
    next = nextWeeklyEvent(events, publicEventNow());

  return (
    <main className="field-wrap event-hub">
      <header>
        <h1>Learn. Put it to work.</h1>
        <p>
          Weekly sessions and occasional intensives with Edmund on AI Skillset
          and Money Mindset. Practical ideas, questions and a useful next step.
        </p>
        <div className="event-hub-actions">
          <Link className="event-primary-button" href="/events/next">
            See the next session ↗
          </Link>
          <Link
            className="text-link"
            href="/events?view=list#previous-sessions"
          >
            Previous sessions ↓
          </Link>
        </div>
      </header>
      <EventBrowser
        key={`${query.view || "list"}:${query.month || "default"}`}
        events={browseItems(events, publicEventNow())}
        today={today}
        initialView={query.view === "calendar" ? "calendar" : "list"}
        initialMonth={
          validMonth(query.month)
            ? query.month
            : next?.date.slice(0, 7) || today.slice(0, 7)
        }
      />
      <p className="event-hub-bottom">
        Keep learning with{" "}
        <Link href="/playbook">The Money &amp; AI Playbook</Link>, or{" "}
        <Link href="/about">read Edmund’s story</Link>.
      </p>
    </main>
  );
}
