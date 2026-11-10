import Link from "next/link";
import { requireAdmin } from "@/lib/users";
import { supabaseAdmin } from "@/lib/supabase-server";
import { EVENT_KEY } from "@/lib/event-tickets";
import {
  grantEventStaff,
  revokeEventStaff,
  saveEventPromo,
  closeLegacyEventCheckouts,
  retryEventTicketEmail,
} from "./actions";
export const dynamic = "force-dynamic";
export default async function EventCheckinAdmin() {
  await requireAdmin();
  const [{ data: registrations, error }, { data: staff, error: staffError }] =
    await Promise.all([
      supabaseAdmin
        .from("event_registrations")
        .select(
          "id,attendee_name,email,phone,status,email_sent_at,checked_in_at",
        )
        .eq("event_key", EVENT_KEY)
        .order("created_at"),
      supabaseAdmin
        .from("event_staff")
        .select("user_id,users!event_staff_user_id_fkey(email)")
        .eq("event_key", EVENT_KEY),
    ]);
  if (error || staffError)
    throw new Error("Event registration storage is not ready");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        Event registrations &amp; check-in
      </h1>
      <p>
        {registrations.length} registrations ·{" "}
        {registrations.filter((r) => r.checked_in_at).length} checked in
      </p>
      <Link href="https://whatelz.ai/event-checkin" className="underline">
        Open staff scanner →
      </Link>
      <p>
        <Link href="/admin/calendar-access" className="underline">
          Manage Guest / Spark / Catalyst membership →
        </Link>
      </p>
      <p>
        Event registrations do not grant app access or upgrade FC membership.
      </p>
      <section>
        <h2 className="text-lg font-semibold">Event staff</h2>
        <p>
          Staff can scan tickets for this event. This does not grant website
          administration.
        </p>
        <form action={grantEventStaff} className="flex gap-2">
          <label>
            Account email
            <input
              name="email"
              type="email"
              required
              className="block border p-2"
            />
          </label>
          <button type="submit">Grant event check-in</button>
        </form>
        {staff.map((s) => (
          <form
            action={revokeEventStaff}
            key={s.user_id}
            className="flex gap-3"
          >
            <span>
              {(Array.isArray(s.users)
                ? s.users[0]?.email
                : (s.users as { email?: string } | null)?.email) ??
                "Account unavailable"}
            </span>
            <input type="hidden" name="user_id" value={s.user_id} />
            <button>Remove event access</button>
          </form>
        ))}
      </section>
      <section>
        <h2 className="text-lg font-semibold">On-site free admission code</h2>
        <p>
          Codes apply only to this event’s on-site form. They are stored as
          hashes and expire when the event starts. Enter an existing code to
          update or disable it.
        </p>
        <form action={saveEventPromo} className="space-y-3">
          <label className="block">
            Code
            <input
              className="block border p-2"
              name="code"
              required
              minLength={4}
              maxLength={64}
              autoComplete="off"
            />
          </label>
          <label className="block">
            Maximum uses
            <input
              className="block border p-2"
              name="max_uses"
              type="number"
              min={1}
              max={20}
              defaultValue={19}
              required
            />
          </label>
          <label className="block">
            <input name="enabled" type="checkbox" defaultChecked /> Enabled
          </label>
          <button type="submit">Save code</button>
        </form>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Registration cutover</h2>
        <p>
          Disable both legacy November 12 Payment Links in Stripe before using
          this. It closes only unfinished checkouts from those links; completed
          tickets remain valid.
        </p>
        <form action={closeLegacyEventCheckouts}>
          <button type="submit">Close unfinished legacy checkouts</button>
        </form>
      </section>
      <section className="overflow-x-auto">
        <h2 className="text-lg font-semibold">Attendees</h2>
        <table>
          <thead>
            <tr>
              {["Name", "Email", "Phone", "Ticket", "Email", "Check-in"].map(
                (s, i) => (
                  <th className="p-2 text-left" key={i}>
                    {s}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {registrations.map((r) => (
              <tr key={r.id}>
                <td className="p-2">{r.attendee_name}</td>
                <td className="p-2">{r.email}</td>
                <td className="p-2">{r.phone}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2">
                  {r.email_sent_at ? (
                    "Sent"
                  ) : r.status === "confirmed" ? (
                    <form action={retryEventTicketEmail}>
                      <input type="hidden" name="ticket_id" value={r.id} />
                      <button type="submit">Retry ticket email</button>
                    </form>
                  ) : (
                    "Cancelled"
                  )}
                </td>
                <td className="p-2">
                  {r.checked_in_at ? "Checked in" : "Not checked in"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
