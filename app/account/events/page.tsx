import Link from "next/link";
import { redirect } from "next/navigation";
import { ensureUserRow } from "@/lib/users";
import { supabaseAdmin } from "@/lib/supabase-server";
import { isPersona } from "@/lib/community-calendar/personas";
import { mapEvent } from "@/lib/public-events/map";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your events",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function AccountEvents() {
  const user = await ensureUserRow();
  if (!user) redirect("/sign-in?redirect_url=/account/events");
  // ensureUserRow requires a server-verified, confirmed auth email. This links
  // event history only; it never merges auth accounts, grants a role or a tree.
  const { error: claimError } = await supabaseAdmin
    .from("event_people")
    .update({ user_id: user.id })
    .eq("email", user.email.toLowerCase())
    .is("user_id", null);
  const [
    { data: tickets, error },
    { data: membership, error: membershipError },
  ] = await Promise.all([
    supabaseAdmin
      .from("event_registrations")
      .select("id,event_key,status,checked_in_at")
      .eq("email", user.email.toLowerCase())
      .eq("event_key", mapEvent.key)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("community_calendar_memberships")
      .select("persona")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  if (error || claimError || membershipError)
    throw Error("Your events could not be loaded. Please try again.");
  const persona = isPersona(membership?.persona) ? membership.persona : "Guest";
  return (
    <main className="field-wrap" style={{ maxWidth: 720, paddingBlock: 64 }}>
      <h1>Your events</h1>
      <p>Signed in as {user.email}</p>
      <p>
        Membership: <strong>{persona}</strong>
      </p>
      <p>
        Edmund manages membership categories. Event attendance does not
        automatically change your membership.
      </p>
      {tickets.length === 0 ? (
        <p>No registrations found for this verified email.</p>
      ) : (
        <ul>
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <h2>{mapEvent.title}</h2>
              <p>
                {mapEvent.dateLabel} ·{" "}
                {ticket.status === "cancelled"
                  ? "Cancelled"
                  : ticket.checked_in_at
                    ? "Checked in"
                    : "Confirmed"}
              </p>
              {ticket.status === "confirmed" && (
                <Link href={`/tickets/${ticket.id}`}>
                  Open your QR ticket →
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
      <p>
        <Link href="/events">Explore events →</Link>
      </p>
      <p>
        <Link href="/account">Your account →</Link>
      </p>
    </main>
  );
}
