import { Suspense } from "react";
import Link from "@/components/admin/AdminLink";
import { adminUrl } from "@/lib/admin-url";
import { dailyOwner } from "@/lib/daily/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { EVENT_KEY } from "@/lib/event-tickets";
import AttendeeList from "@/components/admin/event-admin/AttendeeList";
import {
  grantEventStaff,
  revokeEventStaff,
  saveEventPromo,
  closeLegacyEventCheckouts,
} from "./actions";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Registrations — Admin",
  robots: { index: false, follow: false },
};
export default async function Page() {
  await dailyOwner();
  return (
    <div className="event-admin">
      <AttendeeList />
      <Suspense
        fallback={
          <p className="event-loading" role="status">
            Loading event controls…
          </p>
        }
      >
        <EventControls />
      </Suspense>
    </div>
  );
}
async function EventControls() {
  const { data: staff, error } = await supabaseAdmin
    .from("event_staff")
    .select("user_id,users!event_staff_user_id_fkey(email)")
    .eq("event_key", EVENT_KEY);
  if (error)
    return (
      <p className="event-error">
        Event controls unavailable. Refresh to retry.
      </p>
    );
  return (
    <section className="event-controls" aria-label="Event controls">
      <Link href={adminUrl("/admin/calendar-access")}>Membership access →</Link>
      <details className="event-control">
        <summary>Event staff</summary>
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
      </details>
      <details className="event-control">
        <summary>On-site free admission code</summary>
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
      </details>
      <details className="event-control">
        <summary>Registration cutover</summary>
        <p>
          Disable both legacy November 12 Payment Links in Stripe before using
          this. It closes only unfinished checkouts from those links; completed
          tickets remain valid.
        </p>
        <form action={closeLegacyEventCheckouts}>
          <button type="submit">Close unfinished legacy checkouts</button>
        </form>
      </details>
    </section>
  );
}
