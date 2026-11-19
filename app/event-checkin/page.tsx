import type { Metadata } from "next";
import Link from "next/link";
import { eventStaff } from "@/lib/event-staff";
import { currentEvent as mapEvent } from "@/lib/public-events/map";
import Scanner from "./Scanner";
import { parseTicket } from "@/lib/event-checkin-policy";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Event check-in",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function CheckinPage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string }>;
}) {
  const { ticket: rawTicket } = await searchParams;
  const ticket = rawTicket ? (parseTicket(rawTicket) ?? "") : "";
  const returnPath = `/event-checkin${ticket ? `?ticket=${ticket}` : ""}`;
  const user = await eventStaff();
  if (!user)
    return (
      <main className="field-wrap" style={{ paddingBlock: 64 }}>
        <h1>Event staff sign-in required</h1>
        <p>
          Only the organizer and approved event staff can check attendees in.
        </p>
        <Link href={`/sign-in?redirect_url=${encodeURIComponent(returnPath)}`}>
          Sign in
        </Link>
      </main>
    );
  return (
    <main className="field-wrap" style={{ paddingBlock: 64, maxWidth: 640 }}>
      <h1>Event check-in</h1>
      <p>
        {mapEvent.title}
        <br />
        {mapEvent.dateLabel}
      </p>
      <Scanner initialTicket={ticket} />
    </main>
  );
}
