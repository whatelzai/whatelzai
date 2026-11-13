// Owner-authorized one-time import. Attendee names/contact details never live in Git.
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import {
  seedPlan,
  type SeedHistory,
  type SeedTicket,
} from "../lib/ai-invites/seed";
async function main() {
  const arg = (name: string) => process.argv[process.argv.indexOf(name) + 1];
  if (
    !process.argv.includes("--historical-event") ||
    !process.argv.includes("--ticket-event")
  )
    throw Error("Provide the two explicitly authorized event references.");
  const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
        process.env.SUPABASE_SERVICE_KEY!,
      { auth: { persistSession: false } },
    ),
    owner = process.env.WHATELZ_OWNER_USER_ID;
  if (!owner) throw Error("Owner is not configured.");
  const [tickets, history] = await Promise.all([
    db
      .from("event_registrations")
      .select("id,person_id,attendee_name,email,phone,status,checked_in_at")
      .eq("event_key", arg("--ticket-event")),
    db
      .from("event_attendance")
      .select("id,person_id,display_name,status,returned_later")
      .eq("event_id", arg("--historical-event")),
  ]);
  if (tickets.error || history.error)
    throw Error("Source records unavailable.");
  const returning = process.argv.includes("--confirmed-returning-name")
    ? [arg("--confirmed-returning-name")]
    : [];
  const plan = seedPlan(
    tickets.data as SeedTicket[],
    history.data as SeedHistory[],
    returning,
  );
  if (plan.contacts.length !== 16 || plan.links.length !== 18)
    throw Error(
      "The authorized 5 + 13 cohort changed; review before importing.",
    );
  for (const c of plan.contacts) {
    const { key, ...details } = c;
    const write = await db
      .from("ai_business_contacts")
      .upsert(
        { id: randomUUID(), owner_id: owner, source_key: key, ...details },
        { onConflict: "owner_id,source_key", ignoreDuplicates: true },
      );
    if (write.error)
      throw Error("Contact import failed: " + write.error.message);
    const read = await db
      .from("ai_business_contacts")
      .select("id")
      .eq("owner_id", owner)
      .eq("source_key", key)
      .single();
    if (read.error) throw Error("Imported contact could not be verified.");
    for (const link of plan.links.filter((l) => l.key === key)) {
      const source_key = link.ticket_id
        ? `ticket:${link.ticket_id}`
        : `historical:${link.historical_id}`;
      const result = await db.from("ai_business_attendance_links").upsert(
        {
          id: randomUUID(),
          owner_id: owner,
          contact_id: read.data.id,
          ticket_id: link.ticket_id,
          historical_id: link.historical_id,
          source_key,
        },
        { onConflict: "source_key", ignoreDuplicates: true },
      );
      if (result.error)
        throw Error("Attendance link import failed: " + result.error.message);
    }
  }
  const [people, links, invites] = await Promise.all([
    db
      .from("ai_business_contacts")
      .select("id", { head: true, count: "exact" })
      .eq("owner_id", owner),
    db
      .from("ai_business_attendance_links")
      .select("id", { head: true, count: "exact" })
      .eq("owner_id", owner),
    db
      .from("ai_business_invitations")
      .select("id", { head: true, count: "exact" })
      .eq("owner_id", owner),
  ]);
  if ([people, links, invites].some((r) => r.error))
    throw Error("Import verification failed.");
  console.log(
    JSON.stringify({
      people: people.count,
      attendanceLinks: links.count,
      invitationsLogged: invites.count,
    }),
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
