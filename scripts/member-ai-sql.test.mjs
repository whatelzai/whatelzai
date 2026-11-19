import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(
  `create role anon; create role authenticated; create role service_role; create table users(id uuid primary key,role text); insert into users values ('11111111-1111-4111-8111-111111111111','admin'),('22222222-2222-4222-8222-222222222222','unauthorized');`,
);
await db.exec(
  fs.readFileSync(
    new URL(
      "../supabase/migrations/20261021015412_member_assistant_identity.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
const u = "22222222-2222-4222-8222-222222222222",
  owner = "11111111-1111-4111-8111-111111111111",
  c = "33333333-3333-4333-8333-333333333333",
  r = "44444444-4444-4444-8444-444444444444";
await db.query("insert into member_ai_access(user_id,active) values($1,true)", [
  u,
]);
await db.query(
  "insert into member_ai_conversations(id,user_id,title) values($1,$2,$3)",
  [c, u, "SQL fixture"],
);
await db.query("select reserve_member_ai($1,$2,$3,$4,$5,$6)", [
  u,
  r,
  c,
  "hello",
  4000000,
  "gpt-6-luna",
]);
const duplicate = await db.query(
  "select reserve_member_ai($1,$2,$3,$4,$5,$6) as r",
  [u, r, c, "hello", 4000000, "gpt-6-luna"],
);
assert.equal(duplicate.rows[0].r.duplicate, true);
const before = (
  await db.query(
    "select current_cycle_id from member_ai_access where user_id=$1",
    [u],
  )
).rows[0].current_cycle_id;
const fresh = (
  await db.query("select reset_member_ai($1,$2,$3) as id", [owner, u, before])
).rows[0].id;
await db.query("select finish_member_ai($1,$2,$3,$4,$5,$6,$7,$8,$9)", [
  u,
  r,
  "reply",
  100,
  10,
  10,
  false,
  false,
  [],
]);
const cycles = await db.query(
  "select * from member_ai_cycles where user_id=$1",
  [u],
);
assert.equal(Number(cycles.rows.find((x) => x.id === fresh).spent_micro), 0);
assert.equal(Number(cycles.rows.find((x) => x.id === before).spent_micro), 100);
await assert.rejects(() =>
  db.query("select reset_member_ai($1,$2,$3)", [u, u, fresh]),
);
await assert.rejects(() =>
  db.query("select reset_member_ai($1,$2,$3)", [owner, u, before]),
);
await db.query(
  "insert into member_emdee_links(user_id,issuer,subject,vault_id,parent_path) values($1,$2,$3,$4,$5)",
  [
    u,
    "https://emdee.tech",
    "subject-a",
    "55555555-5555-4555-8555-555555555555",
    "example/DAILY.md",
  ],
);
await assert.rejects(() =>
  db.query("update member_emdee_links set subject=$1 where user_id=$2", [
    "subject-b",
    u,
  ]),
);
await assert.rejects(() =>
  db.query(
    "insert into member_emdee_links(user_id,issuer,subject,vault_id,parent_path) values($1,$2,$3,$4,$5)",
    [
      owner,
      "https://emdee.tech",
      "subject-a",
      "66666666-6666-4666-8666-666666666666",
      "example/DAILY.md",
    ],
  ),
);
const request2 = "77777777-7777-4777-8777-777777777777";
await db.query("select reserve_member_ai($1,$2,$3,$4,$5,$6)", [
  u,
  request2,
  c,
  "hello",
  4999999,
  "gpt-6-luna",
]);
await db.query("select finish_member_ai($1,$2,$3,$4,$5,$6,$7,$8,$9)", [
  u,
  request2,
  "",
  0,
  0,
  0,
  true,
  true,
  [],
]);
await assert.rejects(() =>
  db.query("select reserve_member_ai($1,$2,$3,$4,$5,$6)", [
    u,
    "88888888-8888-4888-8888-888888888888",
    c,
    "hello",
    2,
    "gpt-6-luna",
  ]),
);
await assert.rejects(() =>
  db.query("select reserve_member_ai($1,$2,$3,$4,$5,$6)", [
    owner,
    "99999999-9999-4999-8999-999999999999",
    c,
    "hello",
    2,
    "gpt-6-luna",
  ]),
);
await db.exec("set role authenticated");
await assert.rejects(() => db.query("select * from member_ai_messages"));
await assert.rejects(() =>
  db.query("select reset_member_ai($1,$2,$3)", [owner, u, fresh]),
);
console.log(
  "SQL passed: idempotency, old-cycle settlement after reset, stale reset denial, role denial and private table access.",
);
await db.close();
