import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role;
create table users(id uuid primary key);
create table business_team_accounts(user_id uuid,team_id uuid);
create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
for (const f of [
  "20261010023827_member_leads.sql",
  "20261021120000_fcos_briefings.sql",
  "20261022034623_fcos_note_context_and_sharing.sql",
  "20261022064708_lead_profiles_sharing.sql",
  "20261026162822_team_visible_baobeis.sql",
])
  await db.exec(
    fs.readFileSync(
      new URL("../supabase/migrations/" + f, import.meta.url),
      "utf8",
    ),
  );
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const owner = id(1),
  viewer = id(2),
  outsider = id(3),
  unassigned = id(4),
  team = id(9),
  lead = id(10),
  hidden = id(11),
  note = id(20),
  standalone = id(21),
  ownnote = id(22);
for (const u of [owner, viewer, outsider, unassigned])
  await db.query("insert into users values($1)", [u]);
for (const [u, t] of [
  [owner, team],
  [viewer, team],
  [outsider, id(8)],
])
  await db.query("insert into business_team_accounts values($1,$2)", [u, t]);
await db.query(
  "insert into member_leads(id,owner_id,name) values($1,$2,'Visible'),($3,$2,'Hidden')",
  [lead, owner, hidden],
);
await db.query("update member_leads set visibility='private' where id=$1", [
  hidden,
]);
for (const [n, leads] of [
  [note, [lead]],
  [standalone, []],
])
  await db.query(
    "insert into member_briefings(id,owner_id,title,kind,occurred_on,lead_ids)values($1,$2,'Note','HQH','2026-10-27',$3)",
    [n, owner, leads],
  );
const read = async (fn, u, x) =>
  (await db.query(`select ${fn}($1,$2) ok`, [u, x])).rows[0].ok;
assert.equal(await read("can_read_member_lead", viewer, lead), true);
assert.equal(await read("can_read_member_lead", viewer, hidden), false);
assert.equal(await read("can_read_member_lead", owner, hidden), true);
for (const u of [outsider, unassigned]) {
  assert.equal(await read("can_read_member_lead", u, lead), false);
  assert.equal(await read("can_read_member_briefing", u, note), false);
}
assert.equal(await read("can_read_member_briefing", viewer, note), true);
assert.equal(await read("can_read_member_briefing", viewer, standalone), true);
await db.query(
  "insert into member_briefings(id,owner_id,title,kind,occurred_on,lead_ids)values($1,$2,'Care note','HHH','2026-10-27',$3)",
  [ownnote, viewer, [lead]],
);
await assert.rejects(
  db.query(
    "insert into member_briefings(owner_id,title,kind,occurred_on,lead_ids)values($1,'Denied','HQH','2026-10-27',$2)",
    [viewer, [hidden]],
  ),
);
await db.query("update member_leads set visibility='private' where id=$1", [
  lead,
]);
assert.equal(await read("can_read_member_briefing", viewer, note), false);
assert.equal(await read("can_read_member_briefing", viewer, ownnote), true);
assert.equal(await read("can_read_member_briefing", owner, note), true);
await db.query("update member_leads set visibility='team' where id=$1", [lead]);
await db.query(
  "insert into member_lead_visibility(owner_id,recipient_id,mode)values($1,$2,'none')",
  [owner, viewer],
);
assert.equal(await read("can_read_member_lead", viewer, lead), false);
assert.equal(await read("can_read_member_briefing", viewer, note), false);
await db.query(
  "update member_lead_visibility set mode='selected',lead_ids=$1 where owner_id=$2 and recipient_id=$3",
  [[lead], owner, viewer],
);
assert.equal(await read("can_read_member_lead", viewer, lead), true);
assert.equal(await read("can_read_member_lead", viewer, hidden), false);
await db.query(
  "insert into member_briefing_shares(briefing_id,owner_id,recipient_user_id,recipient_label,revoked_at)values($1,$2,$3,'Member',now())",
  [note, owner, viewer],
);
assert.equal(await read("can_read_member_briefing", viewer, note), false);
await db.query(
  "update member_briefing_shares set revoked_at=null where briefing_id=$1",
  [note],
);
await db.query("update member_briefings set visibility='private' where id=$1", [
  note,
]);
assert.equal(await read("can_read_member_briefing", viewer, note), false);
assert.equal(await read("can_read_member_briefing", owner, note), true);
assert.deepEqual(
  (
    await db.query("select id from shared_member_lead_ids($1)", [viewer])
  ).rows.map((x) => x.id),
  [lead],
);
await db.query("delete from business_team_accounts where user_id=$1", [viewer]);
assert.equal(await read("can_read_member_lead", viewer, lead), false);
assert.equal(await read("can_read_member_briefing", viewer, standalone), false);
for (const role of ["anon", "authenticated"]) {
  await db.exec(`set role ${role}`);
  for (const sql of [
    "select * from member_leads",
    "select * from member_briefings",
    `select can_read_member_lead('${viewer}','${lead}')`,
    `select * from shared_member_briefing_ids('${viewer}')`,
    `select can_read_member_briefing('${viewer}','${note}')`,
  ])
    await assert.rejects(db.exec(sql), /permission denied/);
  await db.exec("reset role");
}
await db.close();
console.log(
  "Team visibility SQL: defaults, hiding, note linkage, cross-team denial, exclusions, revoked membership and browser denial passed.",
);
