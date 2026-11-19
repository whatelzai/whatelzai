import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
const owner = "11111111-1111-4111-8111-111111111111",
  user = "22222222-2222-4222-8222-222222222222",
  convo = "33333333-3333-4333-8333-333333333333",
  request = "44444444-4444-4444-8444-444444444444";
await db.exec(
  `create role anon;create role authenticated;create role service_role;create table users(id uuid primary key,role text,email text,supabase_auth_user_id uuid);create table business_teams(id uuid primary key,slug text);create table business_team_accounts(team_id uuid,user_id uuid);insert into users values('${owner}','admin','owner@example.invalid','${owner}'),('${user}','unauthorized','member@example.invalid','${user}');insert into business_teams values('${owner}','whatelz-network');insert into business_team_accounts values('${owner}','${user}');`,
);
const migration = async (file) =>
  db.exec(
    fs.readFileSync(
      new URL("../supabase/migrations/" + file, import.meta.url),
      "utf8",
    ),
  );
await migration("20261021015412_member_assistant_identity.sql");
await migration("20261022053000_activated_chat_resets.sql");
await db.exec(
  `insert into member_ai_conversations(id,user_id,title) values('${convo}','${user}','Fixture');`,
);
await db.query("select reserve_member_ai($1,$2,$3,$4,$5,$6)", [
  user,
  request,
  convo,
  "hello",
  100000,
  "gpt-6-luna",
]);
const getCycle = async () =>
  (
    await db.query(
      "select c.* from member_ai_cycles c join member_ai_access a on a.current_cycle_id=c.id where a.user_id=$1",
      [user],
    )
  ).rows[0];
const old = await getCycle();
await migration("20261022053300_fcos_weekly_allowance.sql");
let cycle = await getCycle();
assert.equal(Number(cycle.allowance_micro), 1000000);
assert.equal(Number(cycle.reserved_micro), 100000);
assert.equal(+cycle.ends_at - +cycle.started_at, 604800000);
await assert.rejects(
  () =>
    db.query("select reset_activated_member_ai($1,$2,$3,$4)", [
      owner,
      JSON.stringify([{ user_id: user, expected_cycle: old.id }]),
      5000000,
      "selected",
    ]),
  /Invalid/,
);
const targets = JSON.stringify([{ user_id: user, expected_cycle: old.id }]);
await db.query("select reset_activated_member_ai($1,$2,$3,$4)", [
  owner,
  targets,
  500000,
  "selected",
]);
cycle = await getCycle();
assert.equal(Number(cycle.allowance_micro), 500000);
assert.equal(+cycle.ends_at - +cycle.started_at, 604800000);
await assert.rejects(
  () =>
    db.query("select reset_activated_member_ai($1,$2,$3,$4)", [
      owner,
      targets,
      500000,
      "selected",
    ]),
  /changed/,
);
await db.query("select finish_member_ai($1,$2,$3,$4,$5,$6,$7,$8,$9)", [
  user,
  request,
  "reply",
  321,
  1,
  1,
  false,
  false,
  [],
]);
assert.equal(Number((await getCycle()).spent_micro), 0);
assert.equal(
  Number(
    (
      await db.query("select spent_micro from member_ai_cycles where id=$1", [
        old.id,
      ])
    ).rows[0].spent_micro,
  ),
  321,
);
await db.query(
  "update member_ai_cycles set ends_at=now()-interval '15 days' where id=$1",
  [cycle.id],
);
const r2 = "55555555-5555-4555-8555-555555555555";
await db.query("select reserve_member_ai($1,$2,$3,$4,$5,$6)", [
  user,
  r2,
  convo,
  "new week",
  999999,
  "gpt-6-luna",
]);
cycle = await getCycle();
assert.equal(cycle.reason, "weekly");
assert.equal(Number(cycle.allowance_micro), 1000000);
const days = (+cycle.ends_at - Date.now()) / 86400000;
assert.ok(days > 5.99 && days < 6.01);
await db.query("select finish_member_ai($1,$2,$3,$4,$5,$6,$7,$8,$9)", [
  user,
  r2,
  "reply",
  999999,
  1,
  1,
  false,
  false,
  [],
]);
await assert.rejects(
  () =>
    db.query("select reserve_member_ai($1,$2,$3,$4,$5,$6)", [
      user,
      "66666666-6666-4666-8666-666666666666",
      convo,
      "over budget",
      2,
      "gpt-6-luna",
    ]),
  /allowance reached/,
);
await db.exec("set role authenticated");
await assert.rejects(() =>
  db.query("select reset_member_ai($1,$2,$3)", [owner, user, cycle.id]),
);
await db.close();
console.log(
  "Weekly SQL passed: migration preserves reservations/history, seven-day full/half resets, stale denial, late settlement, anchored rollover and cap enforcement.",
);
