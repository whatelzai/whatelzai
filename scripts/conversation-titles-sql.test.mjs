import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
const a = "11111111-1111-4111-8111-111111111111",
  b = "22222222-2222-4222-8222-222222222222",
  c = "33333333-3333-4333-8333-333333333333",
  d = "44444444-4444-4444-8444-444444444444";
await db.exec(
  `create role anon;create role authenticated;create role service_role;create table users(id uuid primary key);insert into users values('${a}'),('${b}');`,
);
await db.exec(
  `create table member_ai_conversations(id uuid primary key,user_id uuid references users(id),title text,created_at timestamptz default now(),unique(id,user_id));create table member_ai_messages(id uuid primary key default gen_random_uuid(),user_id uuid,conversation_id uuid,role text,body text,created_at timestamptz default now(),foreign key(conversation_id,user_id) references member_ai_conversations(id,user_id));`,
);
await db.exec(
  fs.readFileSync(
    new URL(
      "../supabase/migrations/20261026145214_conversation_titles.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
await db.query(
  "insert into member_ai_conversations(id,user_id,title) values($1,$2,$3),($4,$2,$3)",
  [c, a, "Conversation · 2026-10-26", d],
);
const claim = (u, id) =>
  db.query("select claim_member_ai_title($1,$2) result", [u, id]);
await assert.rejects(() => claim(b, c), /unavailable/);
assert.equal((await claim(a, c)).rows[0].result, null);
await db.query(
  "insert into member_ai_messages(user_id,conversation_id,role,body) values($1,$2,'user',$3),($1,$2,'assistant',$4)",
  [a, c, "X".repeat(3000), "Y".repeat(2000)],
);
const first = (await claim(a, c)).rows[0].result;
assert.equal(first.user.length, 1600);
assert.equal(first.assistant.length, 800);
assert.equal((await claim(a, c)).rows[0].result, null);
await assert.rejects(
  () =>
    db.query("select finish_member_ai_title($1,$2,$3,$4,$5,$6,$7)", [
      b,
      c,
      "Other title",
      "completed",
      10,
      2,
      2,
    ]),
  /unavailable/,
);
await db.query("select finish_member_ai_title($1,$2,$3,$4,$5,$6,$7)", [
  a,
  c,
  "Welcome Planning",
  "completed",
  10,
  2,
  2,
]);
assert.equal(
  (await db.query("select title from member_ai_conversations where id=$1", [c]))
    .rows[0].title,
  "Welcome Planning",
);
await db.query("select finish_member_ai_title($1,$2,$3,$4,$5,$6,$7)", [
  a,
  c,
  "Overwrite",
  "completed",
  10,
  2,
  2,
]);
assert.equal(
  (await db.query("select title from member_ai_conversations where id=$1", [c]))
    .rows[0].title,
  "Welcome Planning",
);
await db.query(
  "insert into member_ai_messages(user_id,conversation_id,role,body) values($1,$2,'user','Example')",
  [a, d],
);
await claim(a, d);
await db.query(
  "update member_ai_conversations set title='My custom title' where id=$1",
  [d],
);
await db.query("select finish_member_ai_title($1,$2,$3,$4,$5,$6,$7)", [
  a,
  d,
  "Automatic title",
  "completed",
  10,
  2,
  2,
]);
assert.equal(
  (await db.query("select title from member_ai_conversations where id=$1", [d]))
    .rows[0].title,
  "My custom title",
);
assert.equal(
  (
    await db.query(
      "select status from member_ai_title_jobs where conversation_id=$1",
      [d],
    )
  ).rows[0].status,
  "preserved",
);
for (const role of ["anon", "authenticated"]) {
  await db.exec("set role " + role);
  await assert.rejects(
    () => db.query("select * from member_ai_title_jobs"),
    /permission denied/,
  );
  await assert.rejects(() => claim(a, c), /permission denied/);
  await db.exec("reset role");
}
await db.close();
console.log(
  "Title SQL passed: owner boundary, bounded exchange, single claim, empty skip, idempotent settlement, custom-title preservation, browser denial.",
);
