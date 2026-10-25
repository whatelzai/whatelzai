import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
const a = "11111111-1111-4111-8111-111111111111",
  b = "22222222-2222-4222-8222-222222222222",
  c = "33333333-3333-4333-8333-333333333333",
  other = "44444444-4444-4444-8444-444444444444",
  image = "55555555-5555-4555-8555-555555555555",
  request = "66666666-6666-4666-8666-666666666666",
  voice = "77777777-7777-4777-8777-777777777777",
  voice2 = "88888888-8888-4888-8888-888888888888";
await db.exec(
  `create role anon;create role authenticated;create role service_role;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table users(id uuid primary key,role text,email text,supabase_auth_user_id uuid);create table business_teams(id uuid primary key,slug text);create table business_team_accounts(team_id uuid,user_id uuid);insert into users values('${a}','admin','one@example.invalid','${a}'),('${b}','unauthorized','two@example.invalid','${b}');insert into business_teams values('${a}','whatelz-network');insert into business_team_accounts values('${a}','${a}'),('${a}','${b}');`,
);
for (const f of [
  "20261021015412_member_assistant_identity.sql",
  "20261022053000_activated_chat_resets.sql",
  "20261022053300_fcos_weekly_allowance.sql",
  "20261025170057_chat_media.sql",
])
  await db.exec(
    fs.readFileSync(
      new URL("../supabase/migrations/" + f, import.meta.url),
      "utf8",
    ),
  );
const one = async (q, args = []) => (await db.query(q, args)).rows[0];
await db.query(
  "insert into member_ai_conversations(id,user_id,title) values($1,$2,$3),($4,$5,$3)",
  [c, a, "Fixture", other, b],
);
await assert.rejects(
  () => db.query("select register_member_image($1,$2,$3)", [a, other, image]),
  /unavailable/,
);
await db.query("select register_member_image($1,$2,$3)", [a, c, image]);
await assert.rejects(
  () =>
    db.query("select reserve_member_ai_images($1,$2,$3,$4,$5,$6,$7)", [
      b,
      request,
      other,
      "image",
      100000,
      "gpt-6-luna",
      [image],
    ]),
  /unavailable/,
);
assert.equal(
  await one("select * from member_ai_requests where id=$1", [request]),
  undefined,
);
await db.query("select reserve_member_ai_images($1,$2,$3,$4,$5,$6,$7)", [
  a,
  request,
  c,
  "image",
  100000,
  "gpt-6-luna",
  [image],
]);
assert.equal(
  (await one("select request_id from member_ai_images where id=$1", [image]))
    .request_id,
  request,
);
const replay = await one(
  "select reserve_member_ai_images($1,$2,$3,$4,$5,$6,$7) r",
  [a, request, c, "image", 100000, "gpt-6-luna", [image]],
);
assert.equal(replay.r.duplicate, true);
await assert.rejects(
  () =>
    db.query("select reserve_member_ai_images($1,$2,$3,$4,$5,$6,$7)", [
      a,
      request,
      c,
      "image",
      100000,
      "gpt-6-luna",
      [],
    ]),
  /changed/,
);
await db.query("select finish_member_ai($1,$2,$3,$4,$5,$6,$7,$8,$9)", [
  a,
  request,
  "reply",
  123,
  1,
  1,
  false,
  false,
  [],
]);
const reserve = (who, id, hash = "a".repeat(64), samples = 960000) =>
  db.query("select reserve_member_dictation($1,$2,$3,$4)", [
    who,
    id,
    hash,
    samples,
  ]);
await reserve(a, voice);
const cycle = (
  await one("select current_cycle_id from member_ai_access where user_id=$1", [
    a,
  ])
).current_cycle_id;
assert.equal(
  Number(
    (
      await one("select reserved_micro from member_ai_cycles where id=$1", [
        cycle,
      ])
    ).reserved_micro,
  ),
  4500,
);
await reserve(a, voice); // no second hold
assert.equal(
  Number(
    (
      await one("select reserved_micro from member_ai_cycles where id=$1", [
        cycle,
      ])
    ).reserved_micro,
  ),
  4500,
);
await assert.rejects(() => reserve(b, voice), /unavailable/);
await assert.rejects(() => reserve(a, voice, "b".repeat(64)), /unavailable/);
await assert.rejects(() => reserve(a, voice2), /being transcribed/);
// Reset while dictation is in flight; settlement must charge its original cycle.
await db.query("select reset_member_ai($1,$2,$3)", [a, a, cycle]);
const fresh = (
  await one("select current_cycle_id from member_ai_access where user_id=$1", [
    a,
  ])
).current_cycle_id;
await db.query("select finish_member_dictation($1,$2,$3,$4,$5)", [
  a,
  voice,
  "A private draft",
  false,
  false,
]);
await db.query("select finish_member_dictation($1,$2,$3,$4,$5)", [
  a,
  voice,
  "A private draft",
  false,
  false,
]);
assert.equal(
  Number(
    (await one("select spent_micro from member_ai_cycles where id=$1", [cycle]))
      .spent_micro,
  ),
  4623,
);
assert.equal(
  Number(
    (await one("select spent_micro from member_ai_cycles where id=$1", [fresh]))
      .spent_micro,
  ),
  0,
);
const cache = await one("select reserve_member_dictation($1,$2,$3,$4) r", [
  a,
  voice,
  "a".repeat(64),
  960000,
]);
assert.equal(cache.r.text, "A private draft");
await reserve(a, voice2, "c".repeat(64), 16000);
await db.query("select finish_member_dictation($1,$2,$3,$4,$5)", [
  a,
  voice2,
  "",
  true,
  true,
]);
assert.equal(
  Number(
    (
      await one("select reserved_micro from member_ai_cycles where id=$1", [
        fresh,
      ])
    ).reserved_micro,
  ),
  75,
);
await db.query(
  "update member_ai_cycles set spent_micro=allowance_micro-reserved_micro where id=$1",
  [fresh],
);
await assert.rejects(
  () => reserve(a, "99999999-9999-4999-8999-999999999999"),
  /allowance reached/,
);
assert.equal(
  (await one("select public from storage.buckets where id='chat-images'"))
    .public,
  false,
);
for (const role of ["anon", "authenticated"]) {
  await db.exec(`set role ${role}`);
  await assert.rejects(
    () => db.query("select * from member_ai_images"),
    /permission/,
  );
  await assert.rejects(
    () => db.query("select * from member_ai_dictations"),
    /permission/,
  );
  await assert.rejects(() => reserve(a, voice), /permission/);
  await db.exec("reset role");
}
await db.close();
console.log(
  "Chat media SQL passed: private image binding/replay, cross-account rollback, atomic voice budget, late settlement, uncertainty, cap, cached transcript and browser denial.",
);
