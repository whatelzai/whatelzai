import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
const owner = "11111111-1111-4111-8111-111111111111",
  user = "22222222-2222-4222-8222-222222222222",
  future = "33333333-3333-4333-8333-333333333333",
  convo = "44444444-4444-4444-8444-444444444444",
  request = "55555555-5555-4555-8555-555555555555";
await db.exec(
  `create role anon;create role authenticated;create role service_role;create table users(id uuid primary key,role text,email text,supabase_auth_user_id uuid);create table business_teams(id uuid primary key,slug text);create table business_team_accounts(team_id uuid,user_id uuid);insert into users values('${owner}','admin','owner@example.invalid','${owner}'),('${user}','unauthorized','member@example.invalid','${user}');insert into business_teams values('${owner}','whatelz-network');insert into business_team_accounts values('${owner}','${user}');`,
);
for (const file of [
  "20261021015412_member_assistant_identity.sql",
  "20261022053000_activated_chat_resets.sql",
  "20261022053300_fcos_weekly_allowance.sql",
  "20261022095557_member_reset_credits.sql",
  "20261022100901_member_reset_credit_expiry.sql",
])
  await db.exec(
    fs.readFileSync(
      new URL("../supabase/migrations/" + file, import.meta.url),
      "utf8",
    ),
  );
const one = async (sql, args = []) => (await db.query(sql, args)).rows[0];
const credit = (id) =>
  one("select * from member_ai_reset_credits where user_id=$1", [id]);
assert.equal(
  (await one("select count(*)::int n from member_ai_reset_credits")).n,
  2,
);
await db.query("insert into users values($1,$2,$3,$1)", [
  future,
  "unauthorized",
  "future@example.invalid",
]);
assert.ok((await credit(future)).id);
for (const id of [owner, user, future]) {
  const row = await credit(id);
  assert.equal(+row.expires_at - +row.granted_at, 604800000);
}

await assert.rejects(
  () =>
    db.query("insert into member_ai_reset_credits(user_id) values($1)", [user]),
  /unique/,
);
await assert.rejects(
  async () =>
    db.query("select use_member_reset_credit($1,$2,null)", [
      future,
      (await credit(future)).id,
    ]),
  /Tree activation/,
);
await db.query(
  "insert into member_ai_conversations(id,user_id,title) values($1,$2,$3)",
  [convo, user, "Fixture"],
);
await db.query("select reserve_member_ai($1,$2,$3,$4,$5,$6)", [
  user,
  request,
  convo,
  "hello",
  100000,
  "gpt-6-luna",
]);
const old = (
  await one("select current_cycle_id from member_ai_access where user_id=$1", [
    user,
  ])
).current_cycle_id;
const token = (await credit(user)).id;
await assert.rejects(
  async () =>
    db.query("select use_member_reset_credit($1,$2,$3)", [user, token, old]),
  /current reply/,
);
assert.equal((await credit(user)).used_at, null);
await db.query("select finish_member_ai($1,$2,$3,$4,$5,$6,$7,$8,$9)", [
  user,
  request,
  "reply",
  25000,
  1,
  1,
  false,
  false,
  [],
]);
await assert.rejects(
  async () =>
    db.query("select use_member_reset_credit($1,$2,null)", [user, token]),
  /changed/,
);
await assert.rejects(
  async () =>
    db.query("select use_member_reset_credit($1,$2,$3)", [
      user,
      (await credit(owner)).id,
      old,
    ]),
  /unavailable/,
);
const used = await one("select use_member_reset_credit($1,$2,$3) id", [
  user,
  token,
  old,
]);
const cycle = await one("select * from member_ai_cycles where id=$1", [
  used.id,
]);
assert.equal(cycle.reason, "member-reset");
assert.equal(Number(cycle.allowance_micro), 1000000);
assert.equal(Number(cycle.spent_micro), 0);
assert.equal(+cycle.ends_at - +cycle.started_at, 604800000);
assert.equal(
  Number(
    (await one("select spent_micro from member_ai_cycles where id=$1", [old]))
      .spent_micro,
  ),
  25000,
);
const count = (await one("select count(*)::int n from member_ai_cycles")).n;
const retries = await Promise.all([
  db.query("select use_member_reset_credit($1,$2,$3) id", [user, token, old]),
  db.query("select use_member_reset_credit($1,$2,$3) id", [user, token, old]),
]);
assert.ok(retries.every((r) => r.rows[0].id === used.id));
assert.equal(
  (await one("select count(*)::int n from member_ai_cycles")).n,
  count,
);
assert.equal((await credit(user)).cycle_id, used.id);
assert.equal((await credit(owner)).used_at, null);
// A used token remains idempotent after expiry; expiry must not grant it again.
await db.query(
  "update member_ai_reset_credits set granted_at=now()-interval '8 days',expires_at=now()-interval '1 day' where user_id=$1",
  [user],
);
assert.equal(
  (await one("select use_member_reset_credit($1,$2,$3) id", [user, token, old]))
    .id,
  used.id,
);
// Expired unused credit is rejected at the database, without creating a cycle.
await db.query("insert into business_team_accounts values($1,$2)", [
  owner,
  future,
]);
await db.query(
  "update member_ai_reset_credits set granted_at=now()-interval '8 days',expires_at=now()-interval '1 day' where user_id=$1",
  [future],
);
const beforeExpiryAttempt = (
  await one("select count(*)::int n from member_ai_cycles")
).n;
await assert.rejects(
  async () =>
    db.query("select use_member_reset_credit($1,$2,null)", [
      future,
      (await credit(future)).id,
    ]),
  /Reset expired/,
);
assert.equal((await credit(future)).used_at, null);
assert.equal(
  (await one("select count(*)::int n from member_ai_cycles")).n,
  beforeExpiryAttempt,
);
assert.equal(
  await one("select * from member_ai_access where user_id=$1", [future]),
  undefined,
);

for (const role of ["anon", "authenticated"]) {
  await db.exec(`set role ${role}`);
  await assert.rejects(
    () => db.query("select * from member_ai_reset_credits"),
    /permission/,
  );
  await assert.rejects(
    async () =>
      db.query("select use_member_reset_credit($1,$2,$3)", [user, token, old]),
    /permission/,
  );
  await db.exec("reset role");
}
await db.close();
console.log(
  "Reset-credit SQL passed: one grant/current and future user, unassigned/cross-account/stale denial, reservation guard, atomic use/replay, retained cycles, seven-day expiry/backfill/future grants, expired rejection and browser privilege denial.",
);
