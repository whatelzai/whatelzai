import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(
  "create role anon;create role authenticated;create role service_role;create table users(id uuid primary key);",
);
for (const f of [
  "20261010023827_member_leads.sql",
  "20261022061236_priority_leads.sql",
])
  await db.exec(
    fs.readFileSync(
      new URL("../supabase/migrations/" + f, import.meta.url),
      "utf8",
    ),
  );
const owner = "11111111-1111-4111-8111-111111111111",
  lead = "22222222-2222-4222-8222-222222222222";
await db.query("insert into users values($1)", [owner]);
await db.query(
  "insert into member_leads(id,owner_id,name)values($1,$2,'Fixture')",
  [lead, owner],
);
assert.equal(
  (await db.query("select is_priority from member_leads")).rows[0].is_priority,
  false,
);
await db.query(
  "insert into member_lead_activities(owner_id,lead_id,title,activity_on,status)values($1,$2,'Captain ball','2026-10-25','Tentative')",
  [owner, lead],
);
await assert.rejects(() =>
  db.query("update member_lead_activities set status='Confirmed'"),
);
await db.exec("set role authenticated");
await assert.rejects(() => db.query("select * from member_leads"));
await assert.rejects(() =>
  db.query("update member_leads set is_priority=true"),
);
await assert.rejects(() => db.query("select * from member_lead_activities"));
await db.close();
console.log(
  "Priority schema: private access preserved; false default and distinct Tentative status verified.",
);
