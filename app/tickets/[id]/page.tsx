import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { supabaseAdmin } from "@/lib/supabase-server";
import { EVENT_KEY, ticketUrl } from "@/lib/event-tickets";
import { mapEvent } from "@/lib/public-events/map";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your event ticket",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data, error } = await supabaseAdmin
    .from("event_registrations")
    .select("id,status,checked_in_at")
    .eq("id", id)
    .eq("event_key", EVENT_KEY)
    .maybeSingle();
  if (error) throw new Error("Ticket unavailable; please try again");
  if (!data) notFound();
  const qr = await QRCode.toDataURL(ticketUrl(id), { width: 600, margin: 4 });
  return (
    <main className="field-wrap" style={{ paddingBlock: 64, maxWidth: 640 }}>
      <p>Your event ticket · {mapEvent.id}</p>
      <h1>{mapEvent.title}</h1>
      <p>
        {mapEvent.dateLabel}
        <br />
        {mapEvent.timeLabel}
        <br />
        {mapEvent.venue}
        <br />
        {mapEvent.address}
      </p>
      {data.status === "cancelled" ? (
        <p>This ticket has been cancelled.</p>
      ) : (
        <>
          {/* A generated QR contains only the opaque ticket URL, never attendee contact data. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qr}
            alt="Your event entry QR code"
            width={300}
            height={300}
            style={{ maxWidth: "100%", height: "auto" }}
          />
          <p>
            {data.checked_in_at
              ? "Already checked in."
              : "Show this QR code to the organizer at the door."}
          </p>
          <p>Keep this ticket private. One ticket admits one person.</p>
          <Link href={`/event-checkin?ticket=${id}`}>Organizer check-in →</Link>
        </>
      )}
    </main>
  );
}
