import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  contactInput,
  matchesInviteLocation,
  type TicketEvidence,
  attendanceFor,
  inviteWriteInput,
  inviteAdminHost,
} from "../lib/ai-invites/model";
import { seedPlan } from "../lib/ai-invites/seed";
const id = "00000000-0000-4000-8000-000000000001",
  owner = "00000000-0000-4000-8000-000000000002",
  other = "00000000-0000-4000-8000-000000000003";
test("registered and cancelled tickets do not imply attendance, repeated scans count one event", () => {
  const contact = { id, event_person_id: "person-a", email: "a@example.com" };
  const tickets: TicketEvidence[] = [
    {
      id: "one",
      event_key: "session",
      person_id: "person-a",
      email: "A@example.com",
      status: "confirmed",
      checked_in_at: null,
    },
    {
      id: "two",
      event_key: "session",
      person_id: "person-a",
      email: "A@example.com",
      status: "cancelled",
      checked_in_at: "2026-11-12",
    },
  ];
  assert.equal(
    attendanceFor(contact, [], tickets, [], {
      session: { title: "AI session", date: "2026-11-12" },
    }).length,
    0,
  );
  tickets[0].checked_in_at = "2026-11-12";
  tickets[1].status = "confirmed";
  assert.equal(
    attendanceFor(contact, [], tickets, [], {
      session: { title: "AI session", date: "2026-11-12" },
    }).length,
    1,
  );
});
test("attendance remains counted without event copy and shared event aliases deduplicate", () => {
  const contact = { id, event_person_id: "p", email: null };
  const ticket = {
    id: "t",
    event_key: "key",
    person_id: "p",
    email: "",
    status: "confirmed",
    checked_in_at: "2026-11-12",
  };
  assert.equal(attendanceFor(contact, [], [ticket], [], {}).length, 1);
  const h = {
    id: "h",
    event_id: "uuid",
    person_id: "p",
    status: "checked_in",
    attendance_on: "2026-11-12",
  };
  const event = { title: "Session", date: "2026-11-12", ref: "key" };
  assert.equal(
    attendanceFor(contact, [], [ticket], [h], { key: event, uuid: event })
      .length,
    1,
  );
});
test("historical sources require an explicit link or person ID, never a similar name", () => {
  const h = {
    id: "history",
    event_id: "june",
    person_id: null,
    status: "checked_in",
    attendance_on: "2026-06-28",
  };
  assert.equal(
    attendanceFor({ id, event_person_id: null, email: null }, [], [], [h], {
      june: { title: "June sharing", date: "2026-06-28" },
    }).length,
    0,
  );
  assert.equal(
    attendanceFor(
      { id, event_person_id: null, email: null },
      [{ contact_id: id, historical_id: "history", ticket_id: null }],
      [],
      [h],
      { june: { title: "June sharing", date: "2026-06-28" } },
    ).length,
    1,
  );
});
test("seed only combines explicitly confirmed returning people or canonical IDs", () => {
  const t = {
    id: "ticket",
    person_id: "p1",
    attendee_name: "RETURNING PERSON",
    email: "p@example.com",
    phone: "",
    status: "confirmed",
    checked_in_at: "2026-11-12",
  };
  const h = {
    id: "history",
    person_id: null,
    display_name: "Returning Person",
    status: "checked_in",
    returned_later: true,
  };
  assert.equal(seedPlan([t], [h], []).contacts.length, 2);
  assert.equal(seedPlan([t], [h], ["Returning Person"]).contacts.length, 1);
  assert.throws(() =>
    seedPlan(
      [t, { ...t, id: "second", person_id: "p2" }],
      [h],
      ["Returning Person"],
    ),
  );
  assert.equal(
    seedPlan([{ ...t, status: "cancelled" }], [h], []).contacts.length,
    1,
  );
});
test("write boundary rejects injected owner/source fields and validates fields", () => {
  const input = {
    action: "invitation",
    id,
    contact_id: other,
    revision: 0,
    invited_on: "2026-11-13",
    event_label: "Next session",
    channel: "whatsapp",
    response: "maybe",
    notes: "",
    voided: false,
  };
  assert.ok(inviteWriteInput.safeParse(input).success);
  assert.equal(
    inviteWriteInput.safeParse({ ...input, owner_id: owner }).success,
    false,
  );
  assert.equal(
    inviteWriteInput.safeParse({ ...input, invited_on: "2026-02-31" }).success,
    false,
  );
  assert.equal(
    inviteWriteInput.safeParse({ ...input, revision: -1 }).success,
    false,
  );
  assert.equal(
    inviteAdminHost(new Request("https://whatelz.ai/api/admin/ai-invites")),
    false,
  );
  assert.equal(
    inviteAdminHost(
      new Request("https://admin.whatelz.ai/api/admin/ai-invites"),
    ),
    true,
  );
});
test("private schema denies browser roles and prevents cross-owner invitation links", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create role service_role;create table public.users(id uuid primary key);create table public.event_people(id uuid primary key);create table public.event_registrations(id uuid primary key);create table public.event_attendance(id uuid primary key);`,
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20261113145620_ai_business_invite_list.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20261113152311_ai_invite_locations.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20261113154122_ai_invitation_unknown_details.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const access = await db.query<{ allowed: boolean }>(
      `select has_table_privilege('anon','public.ai_business_contacts','select') or has_table_privilege('authenticated','public.ai_business_invitations','insert') as allowed`,
    );
    assert.equal(access.rows[0].allowed, false);
    await db.exec(
      `insert into public.users values('${owner}'),('${other}');insert into public.ai_business_contacts(id,owner_id,source_key,name) values('${id}','${owner}','test','Test contact');`,
    );
    const loc = await db.query<{ location: string | null }>(
      `select location from public.ai_business_contacts where id='${id}'`,
    );
    assert.equal(loc.rows[0].location, null);
    await db.exec(
      `update public.ai_business_contacts set location='SG' where id='${id}'`,
    );
    await assert.rejects(
      db.exec(
        `update public.ai_business_contacts set location='XX' where id='${id}'`,
      ),
      /check constraint/,
    );
    await db.exec(
      `insert into public.ai_business_invitations(id,owner_id,contact_id,invited_on,channel,response,source_key) values('${id}','${owner}','${id}',null,null,'unavailable','import:test')`,
    );
    await assert.rejects(
      db.exec(
        `insert into public.ai_business_invitations(id,owner_id,contact_id,response,source_key) values('${other}','${owner}','${id}','declined','import:test')`,
      ),
      /unique constraint/,
    );
    await assert.rejects(
      db.exec(
        `insert into public.ai_business_invitations(id,owner_id,contact_id,invited_on,channel) values('${other}','${other}','${id}','2026-11-13','whatsapp')`,
      ),
      /foreign key/,
    );
    await assert.rejects(
      db.exec(
        `insert into public.ai_business_attendance_links(id,owner_id,contact_id,source_key) values('${other}','${owner}','${id}','invalid')`,
      ),
      /check constraint/,
    );
  } finally {
    await db.close();
  }
});

test("preview writes only allow this deployment's exact configured host", () => {
  const oldEnv = process.env.VERCEL_ENV,
    oldUrl = process.env.VERCEL_URL;
  try {
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_URL = "this-deployment.vercel.app";
    assert.equal(
      inviteAdminHost(
        new Request("https://this-deployment.vercel.app/api/admin/ai-invites"),
      ),
      true,
    );
    assert.equal(
      inviteAdminHost(
        new Request("https://other-deployment.vercel.app/api/admin/ai-invites"),
      ),
      false,
    );
    process.env.VERCEL_ENV = "production";
    assert.equal(
      inviteAdminHost(
        new Request("https://this-deployment.vercel.app/api/admin/ai-invites"),
      ),
      false,
    );
  } finally {
    if (oldEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = oldEnv;
    if (oldUrl === undefined) delete process.env.VERCEL_URL;
    else process.env.VERCEL_URL = oldUrl;
  }
});

test("invite locations filter explicitly without assigning unknown contacts to SG", () => {
  const contacts = [
    { location: "SG" as const },
    { location: "KL" as const },
    { location: "PG" as const },
    { location: null },
  ];
  assert.equal(
    contacts.filter((c) => matchesInviteLocation(c, "all")).length,
    4,
  );
  assert.equal(
    contacts.filter((c) => matchesInviteLocation(c, "SG")).length,
    1,
  );
  assert.equal(
    contacts.filter((c) => matchesInviteLocation(c, "KL")).length,
    1,
  );
  assert.equal(
    contacts.filter((c) => matchesInviteLocation(c, "PG")).length,
    1,
  );
  assert.equal(
    contacts.filter((c) => matchesInviteLocation(c, "unset")).length,
    1,
  );
});

test("location edits accept only supported codes and old clients cannot clear a stored location", () => {
  const input = {
    action: "contact",
    id,
    revision: 1,
    name: "Person",
    email: null,
    phone: "",
    interests: "",
    context: "",
    collaboration: "",
    next_step: "",
    follow_up_on: null,
    relationship: "getting_to_know",
    status: "active",
    priority: false,
  };
  const legacy = contactInput.parse(input);
  assert.equal(Object.hasOwn(legacy, "location"), false);
  for (const location of ["SG", "KL", "PG", null])
    assert.ok(contactInput.safeParse({ ...input, location }).success);
  assert.equal(
    contactInput.safeParse({ ...input, location: "MY" }).success,
    false,
  );
});

test("historical outcomes preserve unknown date/channel and distinguish unavailable from declined", () => {
  const input = {
    action: "invitation",
    id,
    contact_id: other,
    revision: 0,
    invited_on: null,
    event_label: "A past session",
    channel: null,
    response: "unavailable",
    notes: "Could not make the date.",
    voided: false,
  };
  assert.ok(inviteWriteInput.safeParse(input).success);
  assert.ok(
    inviteWriteInput.safeParse({ ...input, response: "declined" }).success,
  );
  assert.equal(
    inviteWriteInput.safeParse({ ...input, source_key: "injected" }).success,
    false,
  );
});
