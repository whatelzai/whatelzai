import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
const owner = "11111111-1111-4111-8111-111111111111",
  a = "22222222-2222-4222-8222-222222222222",
  b = "33333333-3333-4333-8333-333333333333",
  unassigned = "44444444-4444-4444-8444-444444444444";
await db.exec(`create role anon;create role authenticated;create role service_role;
create table users(id uuid primary key,role text,email text,supabase_auth_user_id uuid);
create table business_teams(id uuid primary key,slug text);
create table business_team_accounts(team_id uuid,user_id uuid,person_id uuid,primary key(team_id,user_id));
insert into users values('${owner}','admin','owner@example.invalid','${owner}'),('${a}','unauthorized','a@example.invalid','${a}'),('${b}','unauthorized','b@example.invalid','${b}'),('${unassigned}','unauthorized','x@example.invalid','${unassigned}');
insert into business_teams values('${owner}','whatelz-network');
insert into business_team_accounts values('${owner}','${a}','${a}'),('${owner}','${b}','${b}');`);
for (const file of [
  "20261021015412_member_assistant_identity.sql",
  "20261022053000_activated_chat_resets.sql",
])
  await db.exec(
    fs.readFileSync(
      new URL("../supabase/migrations/" + file, import.meta.url),
      "utf8",
    ),
  );
const access = async (id) =>
  (await db.query("select * from member_ai_access where user_id=$1", [id]))
    .rows[0];
const reset = async (
  targets,
  amount = 5000000,
  scope = "selected",
  actor = owner,
) =>
  (
    await db.query("select reset_activated_member_ai($1,$2,$3,$4) as r", [
      actor,
      JSON.stringify(targets),
      amount,
      scope,
    ])
  ).rows[0].r;
const target = async (id) => ({
  user_id: id,
  expected_cycle: (await access(id))?.current_cycle_id ?? null,
});
assert.equal((await access(a)).active, true);
assert.equal((await access(b)).active, true);
assert.equal(
  (await db.query("select count(*)::int as n from member_ai_cycles")).rows[0].n,
  0,
);
await assert.rejects(
  () => db.query("select ensure_activated_member_ai($1)", [unassigned]),
  /activation/,
);
const conv = "55555555-5555-4555-8555-555555555555",
  request = "66666666-6666-4666-8666-666666666666";
await db.query(
  "insert into member_ai_conversations(id,user_id,title) values($1,$2,$3)",
  [conv, a, "Fixture"],
);
await db.query("select reserve_member_ai($1,$2,$3,$4,$5,$6)", [
  a,
  request,
  conv,
  "hello",
  1000000,
  "gpt-6-luna",
]);
const old = (await access(a)).current_cycle_id;
const staleA = await target(a),
  staleB = await target(b);
await reset([staleA], 2500000);
const half = (await access(a)).current_cycle_id;
assert.equal(
  Number(
    (
      await db.query(
        "select allowance_micro from member_ai_cycles where id=$1",
        [half],
      )
    ).rows[0].allowance_micro,
  ),
  2500000,
);
assert.equal(Number((await access(a)).allowance_micro), 5000000);
await db.query("select finish_member_ai($1,$2,$3,$4,$5,$6,$7,$8,$9)", [
  a,
  request,
  "reply",
  100,
  10,
  10,
  false,
  false,
  [],
]);
assert.equal(
  Number(
    (
      await db.query("select spent_micro from member_ai_cycles where id=$1", [
        old,
      ])
    ).rows[0].spent_micro,
  ),
  100,
);
assert.equal(
  Number(
    (
      await db.query("select spent_micro from member_ai_cycles where id=$1", [
        half,
      ])
    ).rows[0].spent_micro,
  ),
  0,
);
await assert.rejects(() => reset([staleA], 2500000), /changed/);
const countBefore = (
  await db.query("select count(*)::int as n from member_ai_cycles")
).rows[0].n;
await assert.rejects(
  async () =>
    reset(
      [await target(a), { ...staleB, expected_cycle: old }],
      5000000,
      "all",
    ),
  /changed/,
);
assert.equal((await access(b)).current_cycle_id, null);
assert.equal((await access(a)).current_cycle_id, half);
assert.equal(
  (await db.query("select count(*)::int as n from member_ai_cycles")).rows[0].n,
  countBefore,
);
await assert.rejects(() => reset([staleB], 5000000, "all"), /roster changed/);
await assert.rejects(() => reset([staleB, staleB]), /duplicate/);
await assert.rejects(
  () => reset([{ user_id: unassigned, expected_cycle: null }]),
  /activation/,
);
await assert.rejects(() => reset([staleB], 5000000, "selected", a), /Owner/);
await assert.rejects(() => reset([staleB], 123), /Invalid/);
const freshTargets = [await target(a), await target(b)];
const results = await reset(freshTargets, 5000000, "all");
assert.equal(results.length, 2);
for (const id of [a, b]) {
  const cycle = (
    await db.query("select * from member_ai_cycles where id=$1", [
      (await access(id)).current_cycle_id,
    ])
  ).rows[0];
  assert.equal(Number(cycle.allowance_micro), 5000000);
  assert.equal(Number(cycle.spent_micro), 0);
}
await assert.rejects(() => reset(freshTargets, 5000000, "all"), /changed/);
assert.equal(
  (
    await db.query(
      "select count(*)::int as n from member_ai_admin_events where action='reset'",
    )
  ).rows[0].n,
  3,
);
const grants = await db.query(
  "select has_function_privilege('anon','public.reset_activated_member_ai(uuid,jsonb,bigint,text)','execute') as anon,has_function_privilege('authenticated','public.ensure_activated_member_ai(uuid)','execute') as authenticated",
);
assert.equal(grants.rows[0].anon, false);
assert.equal(grants.rows[0].authenticated, false);
await db.close();
console.log(
  "Activated Chat SQL: eligibility, half/full resets, atomic bulk rollback, stale retries, old reservations/history and execute grants passed.",
);
