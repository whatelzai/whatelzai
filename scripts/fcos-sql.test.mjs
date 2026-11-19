import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(
  `create role anon;create role authenticated;create role service_role;create table public.users(id uuid primary key);create table public.member_leads(id uuid primary key,owner_id uuid references public.users(id));`,
);
await db.exec(
  readFileSync(
    new URL(
      "../supabase/migrations/20261021120000_fcos_briefings.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
await db.exec(
  readFileSync(
    new URL(
      "../supabase/migrations/20261022034623_fcos_note_context_and_sharing.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
const owner = "00000000-0000-4000-8000-000000000001",
  other = "00000000-0000-4000-8000-000000000002",
  lead = "00000000-0000-4000-8000-000000000003";
await db.query("insert into public.users values($1),($2)", [owner, other]);
await db.query("insert into public.member_leads values($1,$2)", [lead, owner]);
await db.query(
  "insert into public.member_briefings(owner_id,kind,title,occurred_on,lead_ids) values($1,'HQH','Example',current_date,array[$2::uuid])",
  [owner, lead],
);
await assert.rejects(
  db.query(
    "insert into public.member_briefings(owner_id,kind,title,occurred_on,lead_ids) values($1,'HHH','Cross owner',current_date,array[$2::uuid])",
    [other, lead],
  ),
  /Lead unavailable/,
);
await assert.rejects(
  db.query("update public.member_briefings set owner_id=$1", [other]),
  /identity is immutable/,
);
const access = await db.query(
  "select has_table_privilege('anon','public.member_briefings','select') as anon,has_table_privilege('authenticated','public.member_briefings','select') as member",
);
assert.deepEqual(access.rows, [{ anon: false, member: false }]);

const record = (
  await db.query("select id from public.member_briefings limit 1")
).rows[0];
await db.query(
  "insert into public.member_briefing_shares(briefing_id,owner_id,recipient_user_id,recipient_label) values($1,$2,$3,'Example recipient')",
  [record.id, owner, other],
);
await assert.rejects(
  db.query("update public.member_briefing_shares set owner_id=$1", [other]),
  /check constraint|foreign key/,
);
await assert.rejects(
  db.query(
    "insert into public.member_briefing_shares(briefing_id,owner_id,recipient_user_id,recipient_label) values($1,$2,$3,'Self')",
    [record.id, owner, owner],
  ),
  /check constraint/,
);
await assert.rejects(
  db.query(
    "update public.member_briefings set event_key='event-without-month'",
  ),
  /briefing_event_pair/,
);
await db.query(
  "update public.member_briefings set event_key='example|2026-10-22',event_month='2026-10'",
);
const shareAccess = await db.query(
  "select has_table_privilege('anon','public.member_briefing_shares','select') as anon,has_table_privilege('authenticated','public.member_briefing_shares','select') as member",
);
assert.deepEqual(shareAccess.rows, [{ anon: false, member: false }]);
await db.query(
  "update public.member_briefing_shares set revoked_at=now() where briefing_id=$1",
  [record.id],
);
assert.equal(
  (
    await db.query(
      "select * from public.member_briefing_shares where revoked_at is null",
    )
  ).rows.length,
  0,
);
await db.exec("set role authenticated");
await assert.rejects(
  db.query("select * from public.member_briefings"),
  /permission denied/,
);
await assert.rejects(
  db.query("select * from public.member_briefing_shares"),
  /permission denied/,
);
await db.exec("reset role");
await db.close();
console.log(
  "fcOS SQL ownership, immutable identity and browser denial checks passed.",
);
