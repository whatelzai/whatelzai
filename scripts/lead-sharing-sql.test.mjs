import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role;
create table public.users(id uuid primary key);
create table public.business_team_accounts(user_id uuid,team_id uuid);
create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
for (const file of [
  "20261010023827_member_leads.sql",
  "20261022061236_priority_leads.sql",
  "20261022064708_lead_profiles_sharing.sql",
])
  await db.exec(
    fs.readFileSync(
      new URL("../supabase/migrations/" + file, import.meta.url),
      "utf8",
    ),
  );
const owner = "11111111-1111-4111-8111-111111111111",
  recipient = "22222222-2222-4222-8222-222222222222",
  other = "33333333-3333-4333-8333-333333333333",
  team = "44444444-4444-4444-8444-444444444444";
const a = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  b = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  c = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
for (const id of [owner, recipient, other])
  await db.query("insert into users values($1)", [id]);
for (const id of [owner, recipient])
  await db.query("insert into business_team_accounts values($1,$2)", [
    id,
    team,
  ]);
for (const [id, user] of [
  [a, owner],
  [b, owner],
  [c, other],
])
  await db.query(
    "insert into member_leads(id,owner_id,name)values($1,$2,'Fixture')",
    [id, user],
  );
const read = async () =>
  (await db.query("select * from shared_member_lead_ids($1)", [recipient])).rows
    .map((x) => x.id)
    .sort();
const save = async (mode, ids, rev, person = recipient) =>
  (
    await db.query("select set_member_lead_visibility($1,$2,$3,$4,$5) ok", [
      owner,
      person,
      mode,
      ids,
      rev,
    ])
  ).rows[0].ok;
assert.deepEqual(await read(), []);
assert.equal(await save("selected", [a], 0), true);
assert.deepEqual(await read(), [a]);
assert.equal(await save("all", [], 0), false);
assert.deepEqual(await read(), [a]);
await assert.rejects(() => save("selected", [c], 1));
assert.deepEqual(await read(), [a]);
await assert.rejects(() => save("all", [], 0, other));
assert.equal(await save("all", [], 1), true);
assert.deepEqual(await read(), [a, b]);
const d = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
await db.query(
  "insert into member_leads(id,owner_id,name)values($1,$2,'Future')",
  [d, owner],
);
assert.deepEqual(await read(), [a, b, d]);
assert.equal(await save("none", [], 2), true);
assert.deepEqual(await read(), []);
assert.equal(await save("selected", [b], 3), true);
assert.deepEqual(await read(), [b]);
await db.query("delete from business_team_accounts where user_id=$1", [
  recipient,
]);
assert.deepEqual(await read(), []);
assert.equal(await save("none", [], 4), true);
assert.equal(
  (await db.query("select public from storage.buckets where id='lead-photos'"))
    .rows[0].public,
  false,
);
assert.equal(
  (
    await db.query(
      "select relrowsecurity from pg_class where relname='member_lead_visibility'",
    )
  ).rows[0].relrowsecurity,
  true,
);
for (const role of ["anon", "authenticated"]) {
  await db.exec(`set role ${role}`);
  await assert.rejects(() => db.query("select * from member_lead_visibility"));
  await assert.rejects(() =>
    db.query("select * from shared_member_lead_ids($1)", [recipient]),
  );
  await assert.rejects(() => save("all", [], 5));
  await db.exec("reset role");
}
await db.close();
console.log(
  "Lead visibility: default deny, selected/all/future leads, foreign ownership, stale revisions, revocation, lost assignment, private bucket and browser grants verified.",
);
